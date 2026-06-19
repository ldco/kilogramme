const en = {
  contractGuard: {
    tool: {
      check: { name: 'contract_check', description: 'Check API contract for breaking changes between backend and frontend.' },
      status: { name: 'contract_status', description: 'Show contract guard status.' },
    },
    check: {
      inputBackend: 'Path to backend API definition file',
      inputFrontend: 'Path to frontend API client file',
    },
    change: {
      endpointRemoved: 'Endpoint removed: {method} {path}',
      endpointAdded: 'Endpoint added: {method} {path}',
      authRemoved: '{method} {path}: auth removed',
      fieldRemoved: '{method} {path}: field "{field}" removed from response',
      fieldBecomeOptional: '{method} {path}: field "{field}": required to optional',
      fieldTypeChanged: '{method} {path}: field "{field}": {from} {to}',
      fieldAdded: '{method} {path}: field "{field}" added to response',
    },
    severity: { breaking: 'breaking', warning: 'warning', compatible: 'compatible' },
    error: {
      fileNotFound: 'File not found: {path}',
    },
    status: { ready: 'ready' },
  },
}
export default en
