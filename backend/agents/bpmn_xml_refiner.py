from utils.llm_utils import call_llm, extract_xml_content

def refine_bpmn_xml(bpmn_xml):
    """
    Agent 4: BPMN XML Refiner
    Corrects and improves BPMN XML before it's used for deployment or visualization.
    """
    prompt = f"""
You are a **BPMN XML Refiner Agent**. You are given a **BPMN 2.0 XML string**, and your task is to correct and improve it before it's used for deployment or visualization.

IMPORTANT: Return ONLY the BPMN XML content starting with <?xml and ending with </bpmn:definitions>. Do not include any explanatory text, comments, or markdown formatting.

### Your responsibilities include:

-  **Validate** that the XML conforms to the **BPMN 2.0 schema**
-  **Ensure connectivity** between all `sequenceFlow`, `startEvent`, `task`, `endEvent`, and `gateway` elements
-  **Remove** any:
  - Redundant or duplicate elements
  - Orphaned flows or elements not used in the diagram
  - Empty or unused labels or definitions
-  **Fix issues** such as:
  - Broken or disconnected `bpmndi:BPMNEdge` / `BPMNShape` references
  - Missing layout tags for visual rendering
  - Inconsistent IDs or invalid namespace usage
-  **Add helpful metadata**, such as:
  - `<documentation>` tags for process clarity
  - Human-readable labels on events and tasks
-  **Optimize the layout**:
  - Ensure coordinates (`x`, `y`) of diagram shapes are spaced cleanly
  - Avoid overlaps and improve alignment for clear BPMN viewer rendering
- **Ensure compatibility** with tools like:
  - Camunda Modeler
  - bpmn.io
  - Zeebe

 **Output**:
- A cleaned-up, fully valid **BPMN 2.0 XML string** ready for deployment or visualization

BPMN XML:
{bpmn_xml}
"""
    final_bpmn_xml_raw = call_llm(prompt)
    return extract_xml_content(final_bpmn_xml_raw) 