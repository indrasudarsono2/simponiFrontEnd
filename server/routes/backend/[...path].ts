import { getRouterParam } from 'h3'
import { secureBackendProxy } from '../../utils/backendProxy'

export default defineEventHandler(event => secureBackendProxy(event, getRouterParam(event, 'path') || ''))
