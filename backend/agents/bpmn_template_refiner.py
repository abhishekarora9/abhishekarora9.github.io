from utils.llm_utils import call_llm

def refine_bpmn_template(sop_content, bpmn_template):
    """
    Agent 2: BPMN Template Refiner
    Checks and refines the BPMN template to ensure all critical steps are represented.
    """
    prompt = f"""
You are a BPMN Process Refiner Agent. You will receive a proposed BPMN process (as JSON) and the original SOP text.

Check if all critical steps from the SOP are represented.
Fix incorrect flow sequences or missing elements (like approvals or exceptions).
Ensure the swimlanes match the roles described in the SOP.
Annotate special conditions such as escalation, retry loops, or timeouts.
Return a corrected and enriched JSON template and clearly state what was changed or added with reasons.

SOP Text:
{sop_content}

Proposed BPMN JSON:
{bpmn_template}
"""
    return call_llm(prompt) 