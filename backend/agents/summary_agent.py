from utils.llm_utils import call_llm

def generate_summary(sop_content):
    """
    Agent 5: Summary Agent
    Generates a summary of the SOP content.
    """
    summary_prompt = f"Summarize the following SOP:\n{sop_content}\n\nSummary:"
    return call_llm(summary_prompt) 