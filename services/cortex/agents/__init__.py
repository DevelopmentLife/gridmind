"""Agent registry — all 24 Cortex agents."""

from __future__ import annotations

from typing import TYPE_CHECKING

from agents.aegis import AegisAgent
from agents.argus import ArgusAgent
from agents.comptroller import ComptrollerAgent
from agents.convoy import ConvoyAgent
from agents.forge_agent import ForgeAgent
from agents.gremlin import GremlinAgent
from agents.harbor import HarborAgent
from agents.herald import HeraldAgent
from agents.ledger import LedgerAgent
from agents.medic import MedicAgent
from agents.oracle import OracleAgent
from agents.phoenix import PhoenixAgent
from agents.prism_agent import PrismAgent
from agents.pulse import PulseAgent
from agents.scribe import ScribeAgent
from agents.sentinel import SentinelAgent
from agents.sherlock import SherlockAgent
from agents.steward import StewardAgent
from agents.thrift import ThriftAgent
from agents.titan import TitanAgent
from agents.triage import TriageAgent
from agents.tuner import TunerAgent
from agents.vault_agent import VaultAgent
from agents.vitals import VitalsAgent

if TYPE_CHECKING:
    from cortex.base_agent import BaseAgent

# Registry mapping agent names to their classes
AGENT_REGISTRY: dict[str, type[BaseAgent]] = {
    "argus": ArgusAgent,
    "ledger": LedgerAgent,
    "sentinel": SentinelAgent,
    "oracle": OracleAgent,
    "titan": TitanAgent,
    "prism": PrismAgent,
    "sherlock": SherlockAgent,
    "aegis": AegisAgent,
    "forge": ForgeAgent,
    "convoy": ConvoyAgent,
    "vault": VaultAgent,
    "tuner": TunerAgent,
    "pulse": PulseAgent,
    "medic": MedicAgent,
    "vitals": VitalsAgent,
    "triage": TriageAgent,
    "gremlin": GremlinAgent,
    "phoenix": PhoenixAgent,
    "scribe": ScribeAgent,
    "thrift": ThriftAgent,
    "harbor": HarborAgent,
    "comptroller": ComptrollerAgent,
    "herald": HeraldAgent,
    "steward": StewardAgent,
}

ALL_AGENT_CLASSES: list[type[BaseAgent]] = list(AGENT_REGISTRY.values())
