import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.pydantic_ai_client import DeepseekAIClient
from app.models.api.agent_router import ResponseEvaluation
from app.utils.logger import logger

class EvaluatorAgent(Agent):
    """Evaluates the quality of responses"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "evaluator_prompt.json"

        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['evaluator_agent_prompt']
        
        self.system_message = (
            f"{self.prompt_config['system_message']}\n\n"
            "Evaluate the assistant's response to the user query based on these criteria:\n"
        )
        self.system_message += "\n".join(
            f"- {criterion}" for criterion in self.prompt_config['evaluation_criteria']
        )
        self.system_message += (
            f"\n\nProvide numeric scores on a scale of {self.prompt_config['scoring']['scale']} "
            f"(where {self.prompt_config['scoring']['perfect_score']} is perfect).\n"
            f"{self.prompt_config['response_format']['feedback_guidance']}"
        )
    async def process(self, context: AgentContext) -> AgentContext:
        try:
            if not context.response:
                context.quality_score = 0
                context.metadata["feedback"] = "No response was generated."
                logger.warning("EvaluatorAgent: No response to evaluate")
                return context

            full_context = self._build_evaluation_context(context)

            user_message = (
                f"Full Conversation Context:\n{full_context}\n\n"
                f"Latest user query: \"{context.user_message}\"\n\n"
                f"Assistant response: \"{context.response}\"\n\n"
                "Evaluate this response considering the full conversation flow."
            )

            evaluation = await DeepseekAIClient.generate(
                model_class=ResponseEvaluation,
                user_message=user_message,
                system_message=self.system_message,
                temperature=self.prompt_config['parameters']['temperature'],
                max_tokens=self.prompt_config['parameters']['max_tokens']
            )

            context.quality_score = evaluation.quality_score
            context.metadata["feedback"] = evaluation.feedback
            context.metadata["eval_strengths"] = evaluation.strengths
            context.metadata["eval_weaknesses"] = evaluation.weaknesses

            context.attempts += 1

            logger.info(f"Response quality score: {context.quality_score}")
            logger.info(f"Evaluation strengths: {evaluation.strengths}")
            logger.info(f"Evaluation weaknesses: {evaluation.weaknesses}")
            logger.info(f"Feedback: {evaluation.feedback}")
            logger.info(f"Attempt count: {context.attempts}")

            return context
            
        except Exception as e:
            logger.error(f"Error in EvaluatorAgent: {str(e)}", exc_info=True)
            context.quality_score = self.prompt_config['scoring']['default_error_score']
            context.metadata["eval_error"] = str(e)
            context.metadata["feedback"] = "Evaluation error occurred."
            context.attempts += 1
            return context

    def _build_evaluation_context(self, context: AgentContext) -> str:
        """Build complete conversation context for evaluation"""
        if not context.conversation_history:
            return "New conversation"
        
        lines = []
        for msg in context.conversation_history:
            if msg.get("user"):
                lines.append(f"User: {msg['user']}")
            if msg.get("agent"):
                lines.append(f"Assistant: {msg['agent']}")
        
        return "\n".join(lines)