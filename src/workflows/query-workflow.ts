import { container } from '@medusajs/framework'
import { createStep, StepResponse, createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

const step1 = createStep('step-1', async () => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  return new StepResponse(query)
})

export const queryWorkflow = createWorkflow('query-workflow', function () {
  const query = step1()
  return new WorkflowResponse(query)
})
