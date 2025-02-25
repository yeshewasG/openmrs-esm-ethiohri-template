import { getAsyncLifecycle, defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { createDashboardLink, createDashboardGroup } from '@openmrs/esm-patient-common-lib';
import { dashboardMeta, HIV_CARE_AND_TREATMENT, TEMPLATE_ESM_SERVICE_META } from './dashboard.meta';
import TransferOutSummary from './template-esm/template-esm.component';

const moduleName = '@openmrs/esm-ethio-transfer-out';

const options = {
  featureName: 'template-esm',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const transferOutSummary = getSyncLifecycle(TransferOutSummary, options);

export const templateEsmMenu = getSyncLifecycle(
  createDashboardGroup(HIV_CARE_AND_TREATMENT),
  options
);

export const templateEsmServiceMenu = getSyncLifecycle(
  createDashboardLink({
    ...TEMPLATE_ESM_SERVICE_META,
    moduleName,
  }),
  options
);

export const templateEsmDashboardLink = getSyncLifecycle(
  createDashboardLink({
    ...TEMPLATE_ESM_SERVICE_META,
    moduleName,
  }),
  options,
);
export const templateEsmServiceChart = getSyncLifecycle(
  TransferOutSummary,
  options
);

//Care & treatment dashboard link
export const transferOutDashboardLink = getSyncLifecycle(
  createDashboardLink({
    ...dashboardMeta,
    moduleName,
  }),
  options,
);
export const templateEsmWorkspace = getAsyncLifecycle(() => import('./forms/template-form.component'), options);

export const encounterDeleteConfirmationDialog = getAsyncLifecycle(() => import('./utils/Delete-Encounter.modal'), {
  featureName: 'encounters',
  moduleName: '@openmrs/esm-patient-encounters-app',
});
