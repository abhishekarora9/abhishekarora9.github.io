import os
import openai

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

def call_llm(prompt):
    """Call OpenAI LLM with the given prompt"""
    response = openai.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": "You are a BPMN process builder."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def extract_xml_content(text):
    """
    Extract XML content from LLM response, removing any explanatory text.
    Looks for content between <?xml and </bpmn:definitions>
    """
    if not text:
        return text
    
    # Find the start of XML content
    xml_start = text.find('<?xml')
    if xml_start == -1:
        # Try alternative XML declarations
        xml_start = text.find('<bpmn:definitions')
        if xml_start == -1:
            return text  # No XML found, return as is
    
    # Find the end of XML content
    xml_end = text.find('</bpmn:definitions>')
    if xml_end == -1:
        # If no proper end found, try to find the last occurrence of bpmn:definitions
        last_def = text.rfind('bpmn:definitions')
        if last_def != -1:
            # Find the closing tag after the last occurrence
            xml_end = text.find('>', last_def)
            if xml_end != -1:
                xml_end += 1
        else:
            return text  # No proper end found, return as is
    
    # Extract the XML content including the closing tag
    xml_content = text[xml_start:xml_end + len('</bpmn:definitions>')]
    
    # Clean up any remaining whitespace and ensure proper formatting
    xml_content = xml_content.strip()
    
    # Ensure the content starts with XML declaration or bpmn:definitions
    if not xml_content.startswith('<?xml') and not xml_content.startswith('<bpmn:definitions'):
        return text  # Something went wrong, return original
    
    return xml_content 