import type { PmTool } from './index.js'
import { npmScript, hasNpmScript } from './utils.js'

function makeNpmTool(
  name: string,
  description: string,
  script: string,
): PmTool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async handler() {
      if (!hasNpmScript(script)) {
        return `npm script "${script}" not found in package.json.`
      }
      try {
        const output = npmScript(script)
        return output || `${name} completed successfully.`
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return `${name} failed:\n${msg}`
      }
    },
  }
}

export const deployTools: PmTool[] = [
  makeNpmTool(
    'pm_deploy',
    'Deploy the Puppet Master project to its configured VPS. Builds Docker image, pushes via SSH, runs Ansible deploy playbook, regenerates Traefik config, and health checks.',
    'deploy',
  ),
  makeNpmTool(
    'pm_rollback',
    'Roll back the deployment to the previous Docker image.',
    'rollback',
  ),
  makeNpmTool(
    'pm_deploy_logs',
    'View deployment logs from the VPS.',
    'deploy:logs',
  ),
  makeNpmTool(
    'pm_setup',
    'Provision the VPS with Docker, Dockge, Traefik, and SSH setup.',
    'setup',
  ),
]
