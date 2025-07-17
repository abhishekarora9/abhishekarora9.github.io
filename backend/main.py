
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil, os
import pdfplumber
import openai

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class FileName(BaseModel):
    filename: str

@app.post("/upload")
async def upload(file: UploadFile):
    path = f"{UPLOAD_DIR}/{file.filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename}

@app.post("/process")
async def process(payload: FileName):
    path = f"{UPLOAD_DIR}/{payload.filename}"
    with pdfplumber.open(path) as pdf:
        text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])

    prompt = f"""Convert the following SOP into a BPMN process description with steps, roles, and flow logic:\n{text}"""

    openai.api_key = os.getenv("OPENAI_API_KEY")
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "You are a BPMN process builder"},
            {"role": "user", "content": prompt}
        ]
    )
    logic = response.choices[0].message.content

    bpmn_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
    <bpmn:task id="Task_1" name="{logic.splitlines()[0]}"/>
    <bpmn:endEvent id="EndEvent_1"/>
    <bpmn:sequenceFlow sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow sourceRef="Task_1" targetRef="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>"""

    return {"bpmn_xml": bpmn_xml}
