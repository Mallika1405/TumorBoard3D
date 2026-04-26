import json
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

agent = Agent(
    name="tumorboard_trials",
    seed="tumorboard_trials_seed_2026",
    port=8005,
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
        tumor_ctx = {}
    response = "Something went wrong"
    try:
        r = client.chat.completions.create(
            model="asi1",
            messages=[
                {"role": "system", "content": """You are a clinical trials specialist on a tumor board.
Match the patient to relevant trials and return ONLY valid JSON with fields:
matched_trials (array with name, phase, rationale, key_eligibility, mechanism),
genomic_testing_recommended, priority_tests, trials_note."""},
                {"role": "user", "content": f"Match trials for: {json.dumps(tumor_ctx)}"},
            ],
            max_tokens=1000,
        )
        response = str(r.choices[0].message.content)
    except:
        ctx.logger.exception("Error querying ASI1")
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(), msg_id=uuid4(),
        content=[TextContent(type="text", text=response), EndSessionContent(type="end-session")]
    ))

@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
