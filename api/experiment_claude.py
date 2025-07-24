import os
import asyncio
import json
import httpx
from typing import Dict, Any
from app.utils.logger import logger

API_KEY = os.environ["ANTHROPIC_API_KEY"] = ""

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-3-haiku-20240307"
HEADERS = {
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
}

STUDENT_DATA = [
    {"name": "ramesh", "age": 17, "class": "10th"},
    {"name": "yashwanth", "age": 16, "class": "10th"},
    {"name": "saurabh", "age": 15, "class": "9th"},
]

MARKS_DATA = {
    ("ramesh", 17, "10th"): {"physics": 89},
    ("saurabh", 15, "9th"): {"math": 65, "science": 70},
}

PARENT_CONTACT_DATA = {
    ("ramesh", 17, "10th"): {"phone": "1234567890", "email": "ramesh_parent@test.com"},
    ("saurabh", 15, "9th"): {"phone": "9999999999", "email": "saurabh_parent@test.com"},
}

def student_run_func(args: Dict[str, Any]) -> Dict[str, Any]:
    name, age, class_ = args.get("name"), args.get("age"), args.get("class")
    for s in STUDENT_DATA:
        if (not name or s["name"].lower() == name.lower()) and \
           (not age or s["age"] == age) and \
           (not class_ or s["class"].lower() == class_.lower()):
            return {
                "name": s["name"],
                "age": s["age"],
                "class": s["class"],
                "answer": f"Student {s['name']} found in class {s['class']}"
            }
    return {"name": name, "age": age, "class": class_, "answer": "Student not found."}

def marks_run_func(args: Dict[str, Any]) -> Dict[str, Any]:
    key = (args.get("name", "").lower(), args.get("age"), args.get("class"))
    marks = MARKS_DATA.get(key)
    return {
        "name": args.get("name"),
        "subject_marks": marks or {},
        "answer": f"Marks found: {marks}" if marks else "Marks not found."
    }

def parents_run_func(args: Dict[str, Any]) -> Dict[str, Any]:
    for (n, a, c), contact in PARENT_CONTACT_DATA.items():
        if (not args.get("name") or n.lower() == args["name"].lower()) and \
           (not args.get("age") or a == args["age"]) and \
           (not args.get("class") or c.lower() == args["class"].lower()):
            return {
                "phone": contact["phone"],
                "email": contact["email"],
                "answer": f"Contact: {contact['phone']}, {contact['email']}"
            }
    return {"phone": "", "email": "", "answer": "Contact not found."}

TOOLS = [
    {
        "name": "student_run_func",
        "description": "Get student info by name, age, class",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name of student"},
                "age": {"type": "integer", "description": "Age of student"},
                "class": {"type": "string", "description": "Class of student"}
            },
            "required": []
        },
        "function": student_run_func
    },
    {
        "name": "marks_run_func",
        "description": "Get marks by name, age, class",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "class": {"type": "string"}
            },
            "required": ["name", "age", "class"]
        },
        "function": marks_run_func
    },
    {
        "name": "parents_run_func",
        "description": "Get parent contact by student info",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "class": {"type": "string"}
            },
            "required": []
        },
        "function": parents_run_func
    }
]

def run_tool_by_name(name: str, args: Dict[str, Any]):
    for tool in TOOLS:
        if tool["name"] == name:
            return tool["function"](args)
    return {"error": f"No such tool: {name}"}

async def call_claude(prompt: str):
    tools_json = [
        {
            "name": t["name"],
            "description": t["description"],
            "input_schema": t["input_schema"]
        }
        for t in TOOLS
    ]

    messages = [{"role": "user", "content": prompt}]

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            body = {
                "model": MODEL,
                "max_tokens": 1024,
                "system": "You are a helpful School Assistant who uses tools to answer accurately. And responds in a polite and positively. STRICTLY response should be under 50 words.",
                "tools": tools_json,
                "messages": messages,
                "tool_choice": { 
                    "type": "auto",
                    "disable_parallel_tool_use": False 
                }
            }

            response = await client.post(API_URL, headers=HEADERS, json=body)
            data = response.json()

            stop_reason = data.get("stop_reason")

            if stop_reason == "tool_use":
                tool_use_blocks = [c for c in data["content"] if c["type"] == "tool_use"]
                if not tool_use_blocks:
                    logger.info("Tool use block missing!")
                    break

                results = await asyncio.gather(*[
                    asyncio.to_thread(run_tool_by_name, tb["name"], tb["input"])
                    for tb in tool_use_blocks
                ])

                for tb, result in zip(tool_use_blocks, results):
                    logger.info(f"\n Claude requested tool: {tb['name']}")
                    logger.info(f"Tool result: {result}")

                    messages.append({"role": "assistant", "content": [tb]})
                    messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tb["id"],
                            "content": [{"type": "text", "text": json.dumps(result)}]
                        }]
                    })
                continue

            elif stop_reason == "end_turn":
                final_text = "".join(block["text"] for block in data["content"] if block["type"] == "text")
                logger.info(f"Final Answer: {final_text}")
                break

            else:
                logger.info(f"Unknown stop_reason: {stop_reason}")
                break

async def run_demo():
    queries = [
        # "show me this student name yashwanth with age 16 of class 10th",
        # "show me this student name 'ramesh' his age is 17 of class 10th and show me his physics marks",
        # "show me this parent phone number and email of this student age 15 of class 9th",
        # "this student name of saurabh of age 10 and class 3rd of marks and parents information",

        # "Tell me the physics marks of the student who is 17 years old in class 10th and also provide his contact details",
        # "I need to know the contact of ramesh’s parents and also his science marks",
        # "Who is the student named saurabh and what are his marks in math and science?",
        # "Get the student record for yashwanth and see if we have their parent’s email",
        # "Find the student aged 15 in class 9th and give me both his profile and scores",
        # "Can you show me who studies in class 10th and has age either 16 or 17, and tell me their marks",
        # "Give me student info and parent contact of a student named 'ramesh' or anyone in class 10th with same age",
        # "Is there a student named ramesh in 10th class, if so, what are his scores and how can I contact his parents?",
        # "Find all available information (profile, marks, and parents contact) of the student named ramesh"
        # "How's the weather today?"
        # "What is the population of student in India?"
        # "What is time now?"
        # "How are you?"
        "Tell a story?"
    ]

    for query in queries:
        logger.info("--------------------------------------------")
        logger.info(f"\n Query: {query}")
        await call_claude(query)

if __name__ == "__main__":
    asyncio.run(run_demo())
