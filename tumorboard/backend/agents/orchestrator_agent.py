import json
import httpx
from datetime import datetime
from uuid import uuid4
from openai import OpenAI
from uagents import Agent, Protocol, Context
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement, ChatMessage, TextContent, EndSessionContent, chat_protocol_spec,
)
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(base_url="https://api.asi1.ai/v1", api_key=os.getenv("ASI1_API_KEY"))

# Paste specialist agent addresses here after running each one
SPECIALIST_ADDRESSES = {
    "radiology":   "PASTE_RADIOLOGY_ADDRESS",
    "oncology":    "PASTE_ONCOLOGY_ADDRESS",
    "surgery":     "PASTE_SURGERY_ADDRESS",
    "radiation":   "PASTE_RADIATION_ADDRESS",
    "trials":      "PASTE_TRIALS_ADDRESS",
    "coordinator": "PASTE_COORDINATOR_ADDRESS",
}

agent = Agent(
    name="tumorboard_orchestrator",
    seed="tumorboard_orchestrator_seed_2026",
    port=8000,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)

@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id))

    text = ""
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text

    try:
        tumor_ctx = json.loads(text)
    except:
        tumor_ctx = {"volume_cc": 28.4, "location": "right temporal lobe", "patient_age": 58, "patient_sex": "Male"}

    # Send status
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(), msg_id=uuid4(),
        content=[TextContent(type="text", text="🧠 TumorBoard3D convening 6 specialist agents...")]
    ))

    # Call each specialist sequentially via HTTP (FastAPI agents)
    results = {}
    agent_order = ["radiology", "oncology", "surgery", "radiation", "trials", "coordinator"]
    ports = {"radiology": 8001, "oncology": 8002, "surgery": 8003, "radiation": 8004, "trials": 8005, "coordinator": 8006}

    async with httpx.AsyncClient(timeout=30.0) as http:
        for agent_name in agent_order:
            try:
                resp = await http.post(
                    f"http://localhost:{ports[agent_name]}/submit",
                    json={"text": json.dumps(tumor_ctx)}
                )
                result = resp.json().get("result", {})
                results[agent_name] = result
                tumor_ctx[f"{agent_name}_findings"] = result
            except Exception as e:
                results[agent_name] = {"error": str(e)}

    final = json.dumps(results, indent=2)
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(), msg_id=uuid4(),
        content=[TextContent(type="text", text=f"✅ Tumor Board Complete:\n{final}"), EndSessionContent(type="end-session")]
    ))

@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
