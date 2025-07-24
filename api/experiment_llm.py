import asyncio
import os
from typing import Type, Dict, Any, Union, List, Tuple, Callable
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel
from app.utils.logger import logger

os.environ["ANTHROPIC_API_KEY"] = ""

class BaseTool:
    tool_name: str
    async def run(self, **kwargs): pass

STUDENT_DATA = [
    {"name": "ramesh", "age": 17, "class": "10th"},
    {"name": "yashwanth", "age": 16, "class": "10th"},
    {"name": "saurabh", "age": 15, "class": "9th"},
]

class StudentResponse(BaseModel):
    name: str
    age: int
    class_: str
    answer: str

class StudentInput(BaseModel):
    name: str | None = Field(..., description="Name of the student")
    age: int | None = Field(..., description="Age of the student")
    class_: str | None = Field(..., alias="class", description="Class of the student")

class StudentTool(BaseTool):
    tool_name = "student_tool"
    async def student_run(self, name: str = None, age: int = None, class_: str = None, **kwargs) -> StudentResponse:
        logger.info(f"[StudentTool] Called with name={name}, age={age}, class_={class_}")
        for student in STUDENT_DATA:
            if (not name or student["name"].lower() == name.lower()) and \
               (not age or student["age"] == age) and \
               (not class_ or student["class"].lower() == class_.lower()):
                result = StudentResponse(name=student["name"], age=student["age"], class_=student["class"],
                                       answer=f"Student {student['name']} of age {student['age']} in class {student['class']} found.")
                logger.info(f"[StudentTool] Returning: {result}")
                return result
        result = StudentResponse(name=name or "", age=age or 0, class_=class_ or "", answer="Student not found.")
        logger.info(f"[StudentTool] Returning: {result}")
        return result

MARKS_DATA = {
    ("ramesh", 17, "10th"): {"physics": 89},
    ("saurabh", 15, "9th"): {"math": 65, "science": 70},
}

class MarksResponse(BaseModel):
    name: str
    subject_marks: Dict[str, int]
    answer: str

class MarksInput(BaseModel):
    name: str | None = Field(..., description="Name of the student")
    age: int | None = Field(..., description="Age of the student")
    class_: str | None = Field(..., description="Class the student is enrolled in")

class MarksTool(BaseTool):
    tool_name = "marks_tool"
    async def marks_run(self, name: str, age: int, class_: str, **kwargs) -> MarksResponse:
        logger.info(f"[MarksTool] Called with name={name}, age={age}, class_={class_}")
        key = (name.lower(), age, class_)
        if key in MARKS_DATA:
            marks = MARKS_DATA[key]
            result = MarksResponse(name=name, subject_marks=marks, answer=f"Found marks for {name}: {marks}")
            logger.info(f"[MarksTool] Returning: {result}")
            return result
        result = MarksResponse(name=name, subject_marks={}, answer="Marks not found.")
        logger.info(f"[MarksTool] Returning: {result}")
        return result

PARENT_CONTACT_DATA = {
    ("ramesh", 17, "10th"): {"phone": "1234567890", "email": "ramesh_parent@test.com"},
    ("saurabh", 15, "9th"): {"phone": "9999999999", "email": "saurabh_parent@test.com"},
}

class ParentsResponse(BaseModel):
    phone: str = ""
    email: str = ""
    answer: str

class ParentsInput(BaseModel):
    name: str | None = Field(..., description="Name of the student")
    age: int | None = Field(..., description="Age of the student")
    class_: str | None = Field(..., description="Class the student is enrolled in")

class ParentsContactTool(BaseTool):
    tool_name = "parents_contact_tool"
    async def parent_run(self, name: str = None, age: int = None, class_: str = None, **kwargs) -> ParentsResponse:
        logger.info(f"[ParentsContactTool] Called with name={name}, age={age}, class_={class_}")
        for (student_name, student_age, student_class), contact in PARENT_CONTACT_DATA.items():
            if (not name or student_name.lower() == name.lower()) and \
               (not age or student_age == age) and \
               (not class_ or student_class.lower() == class_.lower()):
                result = ParentsResponse(
                    phone=contact["phone"],
                    email=contact["email"],
                    answer=f"Found parent's contact: Phone - {contact['phone']}, Email - {contact['email']}"
                )
                logger.info(f"[ParentsContactTool] Returning: {result}")
                return result
        result = ParentsResponse(answer="Parent contact info not found.")
        logger.info(f"[ParentsContactTool] Returning: {result}")
        return result

    
student_tool = StudentTool()
marks_tool = MarksTool()
parents_tool = ParentsContactTool()

async def student_run_func(name: str = None, age: int = None, class_: str = None):
    return await student_tool.student_run(name=name, age=age, class_=class_)

async def marks_run_func(name: str, age: int, class_: str):
    return await marks_tool.marks_run(name=name, age=age, class_=class_)

async def parents_run_func(name: str = None, age: int = None, class_: str = None):
    return await parents_tool.parent_run(name=name, age=age, class_=class_)

class ToolHandler:
    def __init__(self):
        self.tools: List[Callable] = []
        self.responses: List[Type[BaseModel]] = []

    def register(self, tool_func: Callable, response_model: Type[BaseModel], input_model: Type[BaseModel],
        description: str) -> Tuple[Callable, Type[BaseModel]]:
        tool_func.__pydantic_tool_schema__ = {
            "name": tool_func.__name__,
            "description": description,
            "input_model": input_model,
        }

        self.tools.append(tool_func)
        self.responses.append(response_model)
        return tool_func, response_model

class LLMService:
    SYSTEM_MESSAGE = """
    Based on the available tools respond in a polite way. If the data is not found respond naturally.
    """

    def __init__(self):
        tool_handler = ToolHandler()
        tool_handler.register(
            student_run_func, 
            StudentResponse,
            StudentInput,
            description="Get a student’s information by their name, age, and class."
        )
        
        tool_handler.register(
            marks_run_func, 
            MarksResponse,
            MarksInput,
            description="Get the subject-wise marks for a student using their name, age, and class."
        )

        tool_handler.register(
            parents_run_func, 
            ParentsResponse,
            ParentsInput,
            description="Retrieve parent contact information based on student’s name, age, and class."
        )

        self.agent = Agent(
            model=AnthropicModel(model_name="claude-3-haiku-20240307"),
            system_prompt=self.SYSTEM_MESSAGE,
            tools=tool_handler.tools,
            deps_type=dict,
            output_type=Union[tuple(tool_handler.responses)],
            parallel_tool_calls=False
        )

    async def handle_user_message(self, message: str) -> Any:
        logger.info(f"[LLMService] Received message: {message}")
        try:
            result = await self.agent.run(message, deps={}, temperature=0.7)
            logger.info(f"[LLMService] LLM returned: {result}")
            return result
        except Exception as e:
            logger.error(f"[LLMService] Error: {e}")
            raise
    
async def run_demo():
    llm = LLMService()
    queries = [
        # "show me this student name yashwanth with age 16 of class 10th",
        # "show me this student name 'ramesh' his age is 17 of class 10th and show me his physics marks",
        # "show me this parent phone number and email of this student age 15 of class 9th",
        # "this student name of saurabh of age 10 and class 3rd of marks and parents information",

        "Tell me the physics marks of the student who is 17 years old in class 10th and also provide his contact details",
        "I need to know the contact of ramesh’s parents and also his science marks",
        "Who is the student named saurabh and what are his marks in math and science?",
        "Get the student record for yashwanth and see if we have their parent’s email",
        "Find the student aged 15 in class 9th and give me both his profile and scores",
        "Can you show me who studies in class 10th and has age either 16 or 17, and tell me their marks",
        "Give me student info and parent contact of a student named 'ramesh' or anyone in class 10th with same age",
        "Is there a student named ramesh in 10th class, if so, what are his scores and how can I contact his parents?"
    ]

    for query in queries:
        print(f"\n>>> Query: {query}")
        result = await llm.handle_user_message(query)
        print(result)

if __name__ == "__main__":
    asyncio.run(run_demo())