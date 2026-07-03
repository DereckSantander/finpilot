import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { RouteErrorBoundary } from '@/app/layouts/RouteErrorBoundary';

/**
 * Definición de rutas (ADR-0009). Cada pantalla se carga de forma diferida
 * (`lazy`) para dividir el bundle por feature y acelerar el arranque. Las rutas
 * literales viven en constants/routes.ts.
 */
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          index: true,
          lazy: () =>
            import('@/features/dashboard/DashboardPage').then((m) => ({
              Component: m.DashboardPage,
            })),
        },
        {
          path: 'income',
          lazy: () =>
            import('@/features/income/IncomePage').then((m) => ({ Component: m.IncomePage })),
        },
        {
          path: 'expenses',
          lazy: () =>
            import('@/features/expenses/ExpensesPage').then((m) => ({
              Component: m.ExpensesPage,
            })),
        },
        {
          path: 'cards',
          lazy: () =>
            import('@/features/credit-cards/CreditCardsPage').then((m) => ({
              Component: m.CreditCardsPage,
            })),
        },
        {
          path: 'cards/:id',
          lazy: () =>
            import('@/features/credit-cards/CardDetailPage').then((m) => ({
              Component: m.CardDetailPage,
            })),
        },
        {
          path: 'goals',
          lazy: () =>
            import('@/features/goals/GoalsPage').then((m) => ({ Component: m.GoalsPage })),
        },
        {
          path: 'goals/:id',
          lazy: () =>
            import('@/features/goals/GoalDetailPage').then((m) => ({
              Component: m.GoalDetailPage,
            })),
        },
        {
          path: 'emergency-fund',
          lazy: () =>
            import('@/features/emergency-fund/EmergencyFundPage').then((m) => ({
              Component: m.EmergencyFundPage,
            })),
        },
        {
          path: 'budget',
          lazy: () =>
            import('@/features/budget/BudgetPage').then((m) => ({ Component: m.BudgetPage })),
        },
        {
          path: 'statistics',
          lazy: () =>
            import('@/features/statistics/StatisticsPage').then((m) => ({
              Component: m.StatisticsPage,
            })),
        },
        {
          path: 'deposits',
          lazy: () =>
            import('@/features/deposits/DepositsPage').then((m) => ({
              Component: m.DepositsPage,
            })),
        },
        {
          path: 'projections',
          lazy: () =>
            import('@/features/projections/ProjectionsPage').then((m) => ({
              Component: m.ProjectionsPage,
            })),
        },
        {
          path: 'insights',
          lazy: () =>
            import('@/features/insights/InsightsPage').then((m) => ({
              Component: m.InsightsPage,
            })),
        },
        {
          path: 'settings',
          lazy: () =>
            import('@/features/settings/SettingsPage').then((m) => ({
              Component: m.SettingsPage,
            })),
        },
        {
          path: '*',
          lazy: () => import('@/app/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
        },
      ],
    },
  ],
  {
    basename: '/finpilot',
  },
);
