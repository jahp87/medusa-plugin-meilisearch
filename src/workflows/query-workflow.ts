// import { createStep, StepResponse, createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
// import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

// const getQueryStep = createStep('get-query-step', async (_, { container }) => {
//   const query = container.resolve(ContainerRegistrationKeys.QUERY)
//   return new StepResponse({ queryObject: query })
// })

// export const queryWorkflow = createWorkflow('query-workflow', function () {
//   const result = getQueryStep()
//   return new WorkflowResponse(result)
// })
