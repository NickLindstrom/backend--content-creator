const { z } = require("zod");

const patchTargetSchema = z.object({
  targetMode: z.enum(["all", "selected"]),
  siteIds: z.array(z.string().uuid()).default([])
}).superRefine((value, ctx) => {
  if (value.targetMode === "selected" && value.siteIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["siteIds"],
      message: "Select at least one site when targetMode is selected"
    });
  }
});

const patchRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

module.exports = {
  patchTargetSchema,
  patchRunsQuerySchema
};