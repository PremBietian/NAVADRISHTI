
"""CERBERUS-X Knowledge Graph.

Builds a provenance-preserving graph from EvidenceRecord objects.

Nodes:
- Evidence sources
- Original entity references
- Extracted claims

Edges:
- CONTAINS_ENTITY
- SUPPORTS_CLAIM
- CLAIMS_ABOUT
- SAME_ENTITY_AS

Features:
- Duplicate relationship prevention
- Source-location traceability
- Cross-source entity resolution
- Claim retrieval across matched entities
- GraphML export
- Image bounding-box traceability

Entity resolution adds relationships between original entity nodes.
It never deletes or merges the original entities.
"""

import json
from typing import Any

import networkx as nx

from backend.app.schemas.evidence import EvidenceRecord
from backend.app.graph.entity_resolution import (
    ResolutionDecision,
    resolve_records,
)


class KnowledgeGraph:
    """Manage evidence, entities, claims and resolution relationships."""

    def __init__(self) -> None:
        self.graph = nx.MultiDiGraph()

    @staticmethod
    def _safe_attributes(data: dict[str, Any]) -> dict[str, Any]:
        """Convert attributes into GraphML-compatible scalar values."""

        result: dict[str, Any] = {}

        for key, value in data.items():

            if value is None:
                continue

            if isinstance(value, (str, int, float, bool)):
                result[key] = value

            else:
                result[key] = json.dumps(
                    value,
                    ensure_ascii=False,
                    sort_keys=True,
                    default=str,
                )

        return result

    def _add_edge_once(
        self,
        source: str,
        target: str,
        **attributes: Any,
    ) -> None:
        """Add an edge only if an identical relationship doesn't exist."""

        safe_attributes = self._safe_attributes(attributes)

        if self.graph.has_edge(source, target):

            existing_edges = self.graph.get_edge_data(
                source,
                target,
            )

            for existing_attributes in existing_edges.values():

                if existing_attributes == safe_attributes:
                    return

        self.graph.add_edge(
            source,
            target,
            **safe_attributes,
        )

    # ------------------------------------------------------
    # ADD EVIDENCE
    # ------------------------------------------------------

    def add_evidence(self, record: EvidenceRecord) -> None:
        """Add one evidence record and its entities and claims."""

        evidence_node = f"evidence:{record.evidence_id}"

        # --------------------------------------------------
        # 1. EVIDENCE NODE
        # --------------------------------------------------

        self.graph.add_node(
            evidence_node,
            **self._safe_attributes({
                "node_type": "EVIDENCE",
                "evidence_id": record.evidence_id,
                "source_name": record.source_name,
                "modality": record.modality.value,
                "source_uri": record.source_uri,
                "source_hash_sha256": record.source_hash_sha256,
                "verification_status": record.verification_status.value,
                "reliability_score": record.reliability_score,
                "extraction_confidence": record.extraction_confidence,
                "author_provenance": record.author_provenance,
                "ingested_at": record.ingested_at.isoformat(),
            }),
        )

        entities_by_id = {
            entity.entity_id: entity
            for entity in record.entities
        }

        # --------------------------------------------------
        # 2. ENTITY NODES
        # --------------------------------------------------

        for entity in record.entities:

            entity_node = f"entity:{entity.entity_id}"

            self.graph.add_node(
                entity_node,
                **self._safe_attributes({
                    "node_type": "ENTITY",
                    "entity_id": entity.entity_id,
                    "name": entity.name,
                    "entity_type": entity.entity_type,
                    "normalized_name": entity.normalized_name,
                    "attributes": entity.attributes,
                }),
            )

            self._add_edge_once(
                evidence_node,
                entity_node,
                relation="CONTAINS_ENTITY",
            )

        # --------------------------------------------------
        # 3. CLAIM NODES WITH SOURCE TRACEABILITY
        # --------------------------------------------------

        for claim in record.claims:

            claim_node = f"claim:{claim.claim_id}"

            location = claim.source_location

            image_region = (
                location.image_region
                if location is not None
                else None
            )

            self.graph.add_node(
                claim_node,
                **self._safe_attributes({

                    "node_type": "CLAIM",
                    "claim_id": claim.claim_id,

                    "subject": claim.subject,
                    "subject_entity_id": claim.subject_entity_id,
                    "predicate": claim.predicate,

                    "object_value": str(claim.object),
                    "object_value_json": claim.object,
                    "object_value_type": type(claim.object).__name__,

                    "polarity": claim.polarity.value,

                    "verification_status": (
                        claim.verification_status.value
                    ),

                    "extraction_confidence": (
                        claim.extraction_confidence
                    ),

                    "valid_from": (
                        claim.valid_from.isoformat()
                        if claim.valid_from else None
                    ),

                    "valid_until": (
                        claim.valid_until.isoformat()
                        if claim.valid_until else None
                    ),

                    "time_precision": claim.time_precision.value,

                    # Complete original source location.
                    "source_location": (
                        location.model_dump_json()
                        if location else None
                    ),

                    # PDF traceability.
                    "source_page": (
                        location.page if location else None
                    ),

                    # Paragraph traceability.
                    "source_paragraph": (
                        location.paragraph if location else None
                    ),

                    # Excel traceability.
                    "source_sheet": (
                        location.sheet if location else None
                    ),

                    "source_row": (
                        location.row if location else None
                    ),

                    "source_column": (
                        location.column if location else None
                    ),

                    # IMAGE TRACEABILITY.
                    # Both attributes are maintained for compatibility.
                    "source_image_region": image_region,
                    "image_region": image_region,

                    # Character-level traceability.
                    "source_character_start": (
                        location.character_start
                        if location else None
                    ),

                    "source_character_end": (
                        location.character_end
                        if location else None
                    ),
                }),
            )

            # --------------------------------------------------
            # 4. EVIDENCE-CLAIM RELATIONSHIP
            # --------------------------------------------------

            self._add_edge_once(
                evidence_node,
                claim_node,
                relation="SUPPORTS_CLAIM",
            )

            # --------------------------------------------------
            # 5. CLAIM-ENTITY LINKING
            # --------------------------------------------------

            # Primary linking method: explicit entity ID.
            if claim.subject_entity_id is not None:

                entity = entities_by_id.get(
                    claim.subject_entity_id
                )

                if entity is not None:

                    self._add_edge_once(
                        claim_node,
                        f"entity:{entity.entity_id}",
                        relation="CLAIMS_ABOUT",
                        linking_method="ENTITY_ID",
                    )

                # Never guess by name when an explicit ID exists.
                continue

            # Legacy fallback: exact name matching.
            matching_entities = [
                entity
                for entity in record.entities
                if (
                    claim.subject.casefold() == entity.name.casefold()
                    or claim.subject == entity.entity_id
                )
            ]

            if len(matching_entities) == 1:

                entity = matching_entities[0]

                self._add_edge_once(
                    claim_node,
                    f"entity:{entity.entity_id}",
                    relation="CLAIMS_ABOUT",
                    linking_method="EXACT_NAME_FALLBACK",
                )

    # ------------------------------------------------------
    # ENTITY RESOLUTION
    # ------------------------------------------------------

    def add_entity_resolution(
        self,
        records: list[EvidenceRecord],
    ) -> None:
        """Connect matched entity references without merging nodes."""

        results = resolve_records(records)

        for result in results:

            if result.decision != ResolutionDecision.MATCHED:
                continue

            first_node = f"entity:{result.first_entity_id}"
            second_node = f"entity:{result.second_entity_id}"

            if first_node not in self.graph:
                continue

            if second_node not in self.graph:
                continue

            self._add_edge_once(
                first_node,
                second_node,
                relation="SAME_ENTITY_AS",
                resolution_decision=result.decision.value,
                matching_score=result.matching_score,
                matching_reasons=result.matching_reasons,
                first_entity_id=result.first_entity_id,
                second_entity_id=result.second_entity_id,
                first_evidence_id=result.first_evidence_id,
                second_evidence_id=result.second_evidence_id,
                resolution_method="ENTITY_RESOLUTION",
            )

    def add_records(self, records: list[EvidenceRecord]) -> None:
        """Add multiple records, then resolve entities across sources."""

        for record in records:
            self.add_evidence(record)

        self.add_entity_resolution(records)

    # ------------------------------------------------------
    # ENTITY RESOLUTION QUERIES
    # ------------------------------------------------------

    def get_entity_matches(
        self,
        entity_id: str,
    ) -> list[dict[str, Any]]:
        """Return direct entity matches and explanations."""

        entity_node = f"entity:{entity_id}"

        if entity_node not in self.graph:
            return []

        matches = []
        connected_edges = []

        for _, target, attributes in self.graph.out_edges(
            entity_node,
            data=True,
        ):
            connected_edges.append((target, attributes))

        for source, _, attributes in self.graph.in_edges(
            entity_node,
            data=True,
        ):
            connected_edges.append((source, attributes))

        seen = set()

        for matched_node, attributes in connected_edges:

            if attributes.get("relation") != "SAME_ENTITY_AS":
                continue

            if matched_node in seen:
                continue

            seen.add(matched_node)

            entity_attributes = self.graph.nodes[matched_node]

            matches.append({
                "entity_id": entity_attributes.get("entity_id"),
                "name": entity_attributes.get("name"),
                "entity_type": entity_attributes.get("entity_type"),
                "matching_score": attributes.get("matching_score"),
                "matching_reasons": attributes.get("matching_reasons"),
                "first_evidence_id": attributes.get("first_evidence_id"),
                "second_evidence_id": attributes.get("second_evidence_id"),
            })

        return matches

    # ------------------------------------------------------
    # CLAIM RETRIEVAL
    # ------------------------------------------------------

    def get_entity_claims(
        self,
        entity_id: str,
    ) -> list[dict[str, Any]]:
        """Return claims linked to this entity and direct matches."""

        entity_node = f"entity:{entity_id}"

        if entity_node not in self.graph:
            return []

        related_entity_nodes = {entity_node}

        for match in self.get_entity_matches(entity_id):

            matched_id = match.get("entity_id")

            if matched_id:
                related_entity_nodes.add(f"entity:{matched_id}")

        claims = []
        seen_claims = set()

        for related_node in related_entity_nodes:

            for claim_node in self.graph.predecessors(related_node):

                attributes = self.graph.nodes[claim_node]

                if attributes.get("node_type") != "CLAIM":
                    continue

                claim_id = attributes.get("claim_id")

                if claim_id in seen_claims:
                    continue

                seen_claims.add(claim_id)

                claims.append(dict(attributes))

        return claims

    def get_claim_sources(
        self,
        claim_id: str,
    ) -> list[dict[str, Any]]:
        """Find evidence sources associated with a claim."""

        claim_node = f"claim:{claim_id}"

        if claim_node not in self.graph:
            return []

        sources = []

        for source_node in self.graph.predecessors(claim_node):

            attributes = self.graph.nodes[source_node]

            if attributes.get("node_type") == "EVIDENCE":

                sources.append({
                    "evidence_id": attributes["evidence_id"],
                    "source_name": attributes["source_name"],
                    "modality": attributes["modality"],
                    "source_uri": attributes.get("source_uri"),
                    "source_hash_sha256": (
                        attributes.get("source_hash_sha256")
                    ),
                })

        return sources

    # ------------------------------------------------------
    # GRAPH SUMMARY
    # ------------------------------------------------------

    def get_summary(self) -> dict[str, int]:
        """Return counts of node types and graph relationships."""

        counts = {
            "evidence_nodes": 0,
            "entity_nodes": 0,
            "claim_nodes": 0,
            "relationships": self.graph.number_of_edges(),
            "entity_resolution_relationships": 0,
        }

        for _, attributes in self.graph.nodes(data=True):

            node_type = attributes.get("node_type")

            if node_type == "EVIDENCE":
                counts["evidence_nodes"] += 1

            elif node_type == "ENTITY":
                counts["entity_nodes"] += 1

            elif node_type == "CLAIM":
                counts["claim_nodes"] += 1

        for _, _, attributes in self.graph.edges(data=True):

            if attributes.get("relation") == "SAME_ENTITY_AS":
                counts["entity_resolution_relationships"] += 1

        return counts

    # ------------------------------------------------------
    # GRAPH EXPORT
    # ------------------------------------------------------

    def to_node_link_data(self) -> dict[str, Any]:
        """Export graph data in node-link JSON-compatible format."""

        return nx.node_link_data(self.graph)

    def save_graph(self, output_path: str) -> None:
        """Save a GraphML-compatible copy of the graph."""

        export_graph = nx.MultiDiGraph()

        for node, attributes in self.graph.nodes(data=True):

            export_graph.add_node(
                node,
                **self._safe_attributes(dict(attributes)),
            )

        for source, target, key, attributes in self.graph.edges(
            keys=True,
            data=True,
        ):

            export_graph.add_edge(
                source,
                target,
                key=key,
                **self._safe_attributes(dict(attributes)),
            )

        nx.write_graphml(export_graph, output_path)
