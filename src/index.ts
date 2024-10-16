import { getAsyncLifecycle, defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { dashboardMeta } from './dashboard.meta';
import TransferOutSummary from './transfer-out/transfer-out-summary.component';

const moduleName = '@openmrs/esm-ethio-transfer-out';

const options = {
  featureName: 'transfer-out',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const transferOutSummary = getSyncLifecycle(TransferOutSummary, options);

//Care & treatment dashboard link
export const transferOutDashboardLink = getSyncLifecycle(
  createDashboardLink({
    ...dashboardMeta,
    moduleName,
  }),
  options,
);
export const transferOutWorkspace = getAsyncLifecycle(() => import('./forms/transfer-out-form.component'), options);

export const encounterDeleteConfirmationDialog = getAsyncLifecycle(() => import('./utils/Delete-Encounter.modal'), {
  featureName: 'encounters',
  moduleName: '@openmrs/esm-patient-encounters-app',
});
