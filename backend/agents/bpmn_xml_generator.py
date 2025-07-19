from utils.llm_utils import call_llm, extract_xml_content

def generate_bpmn_xml(refined_template):
    """
    Agent 3: BPMN XML Generator
    Converts structured BPMN process in JSON format into valid BPMN 2.0 compliant XML.
    """
    prompt = f"""
You are a BPMN XML Generator Agent. Given a structured BPMN process in JSON format, convert it into a valid BPMN 2.0 compliant XML.

IMPORTANT: Return ONLY the BPMN XML content starting with <?xml and ending with </bpmn:definitions>. Do not include any explanatory text, comments, or markdown formatting.

Ensure:
- Every task/gateway/event has a unique ID
- Correct sequence flows with sourceRef and targetRef
- Proper lane and participant structure
- BPMN namespaces and structure are intact
- Add explicit <bpmn:dataObject> elements to represent business data (card info, identity info, refund amount, logs, receipt, etc.) or BPMN annotations to capture business rules, just ask. Also, I can provide a Camunda or other tooling compatible .bpmn file with correct diagram info on request.

Important rules to ensure valid BPMN XML:
1. All <bpmn:sequenceFlow> IDs **must be unique**. Do not reuse IDs for different flows.
2. All sequence flow IDs referenced in <incoming> and <outgoing> **must be defined explicitly**.
3. Avoid using <bpmn:ConditionExpression> (incorrect). Use:
   <bpmn:conditionExpression xsi:type="tFormalExpression">expression_here</bpmn:conditionExpression>

BPMN JSON:
{refined_template}
"""
    bpmn_xml_raw = call_llm(prompt)
    return extract_xml_content(bpmn_xml_raw) 