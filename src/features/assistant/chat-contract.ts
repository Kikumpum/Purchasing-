import { z } from "zod";

export const maxHistoryTurns = 3;
export const maxQuestionLength = 1000;
export const maxHistoryAnswerLength = 2400;
export const questionSchema = z.string().trim().min(2).max(maxQuestionLength);
export const assistantRequest = z.object({
  question: questionSchema,
  history: z.array(z.object({
    question: questionSchema,
    answer: z.string().trim().min(1).max(maxHistoryAnswerLength),
  })).max(maxHistoryTurns).default([]),
});

export const availabilitySchema = z.enum(["ready", "sign-in", "inactive", "unconfigured", "unavailable"]);
export type AssistantAvailability = z.infer<typeof availabilitySchema>;
