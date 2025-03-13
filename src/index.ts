import { getAsyncLifecycle, defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { createDashboardGroup, createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { kpDashboardMeta, kppDashboardMeta, snnDashboardMeta } from './dashboard.meta';

const moduleName = '@icap-ethiopia/esm-kpp-app';

const options = {
  featureName: 'kpp',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const kpp = getAsyncLifecycle(() => import('./key-priority-population/index'), options);
export const sns = getAsyncLifecycle(() => import('./social-ntw-service/index'), options);
export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const kppEsmMenu = getSyncLifecycle(createDashboardGroup(kpDashboardMeta), options);

export const templateEsmDashboardLink = getSyncLifecycle(
  createDashboardLink({
    ...kppDashboardMeta,
    moduleName,
  }),
  options,
);
export const snsDashboardLink = getSyncLifecycle(
  createDashboardLink({
    ...snnDashboardMeta,
    moduleName,
  }),
  options,
);
export const snsForm = getAsyncLifecycle(() => import('./forms/sns-form'), options);
export const kppForm = getAsyncLifecycle(() => import('./forms/kpp-form'), options);
export const templateEsmWorkspace = getAsyncLifecycle(() => import('./forms/template-form.component'), options);

export const encounterDeleteConfirmationDialog = getAsyncLifecycle(() => import('./utils/Delete-Encounter.modal'), {
  featureName: 'encounters',
  moduleName: '@openmrs/esm-patient-encounters-app',
});
