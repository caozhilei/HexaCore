
INSERT INTO public.agents (name, description, config, owner_id)
VALUES
  ('Coding Assistant', 'Specialized in writing and debugging code.', '{"model": "deepseek-coder", "temperature": 0.2, "system_prompt": "You are an expert software engineer. Write clean, efficient, and well-documented code."}'::jsonb, '038523e5-170b-4a83-8e46-36ea5d0896fb'),
  ('General Assistant', 'Helpful assistant for general tasks and questions.', '{"model": "gpt-4o", "temperature": 0.7, "system_prompt": "You are a helpful and friendly assistant."}'::jsonb, '038523e5-170b-4a83-8e46-36ea5d0896fb'),
  ('Support Bot', 'Customer support agent for HexaCore inquiries.', '{"model": "qwen-turbo", "temperature": 0.5, "system_prompt": "You are a support agent for HexaCore. Answer questions about the platform politely."}'::jsonb, '038523e5-170b-4a83-8e46-36ea5d0896fb');
