from utils.llm_utils import call_llm

def generate_bpmn_template(sop_content):
    """
    Agent 1: BPMN Template Generator
    Extracts high-level process structure and converts it into a BPMN process template.
    """
    prompt = f"""
You are a BPMN Process Designer Agent. You are given an SOP text extracted from a document. Your task is to extract a high-level process structure and convert it into a BPMN process template.

Analyze the content and identify:
- Actors (roles or departments)
- Start event
- User tasks, Service tasks, Gateways, and End events
- Sequence flow (in order)
- Special conditions (e.g., wait periods, triggers)
- Swimlanes for responsibilities

Output the process in a structured JSON format like:
{{
  "start_event": "Start",
  "tasks": [
    {{"id": "Task_1", "name": "Receive Application", "actor": "Customer Support"}},
    {{"id": "Gateway_1", "type": "exclusive", "name": "Is Application Complete?"}},
    {{"id": "Task_2", "name": "Request Additional Documents", "actor": "Customer Support"}}
  ],
  "end_event": "Application Accepted",
  "swimlanes": ["Customer Support", "Compliance Team"]
}}

SOP Text:
{sop_content}
"""
    return call_llm(prompt) 