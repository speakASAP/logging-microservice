import { Injectable } from '@nestjs/common';
import { LoggingDashboardUser } from '../auth/logging-dashboard.guard';

type EntitlementStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'not_configured';
type BillingState = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'not_configured';

export type LoggingEntitlementResponse = {
  tenant_id: string;
  status: EntitlementStatus;
  plan: {
    id: string;
    name: string;
    interval: 'month' | 'year' | null;
  };
  trial: {
    active: boolean;
    ends_at: string | null;
  };
  billing: {
    state: BillingState;
    payment_state_source: 'payments-microservice' | null;
  };
  limits: {
    api_keys_active: number;
    hooks_active: number;
    retention_days: number;
    monthly_ingest_events: number;
    dashboard_users: number;
    ai_analysis_runs_per_month: number;
  };
  usage: {
    api_keys_active: number;
    hooks_active: number;
    monthly_ingest_events: number;
    ai_analysis_runs_this_month: number;
  };
  features: {
    api_key_management: boolean;
    hook_management: boolean;
    ai_analysis: boolean;
    export: boolean;
  };
};

@Injectable()
export class EntitlementsService {
  getCurrentEntitlement(user: LoggingDashboardUser): LoggingEntitlementResponse {
    return {
      tenant_id: user.tenantId,
      status: 'not_configured',
      plan: {
        id: 'logging_free',
        name: 'Free',
        interval: null,
      },
      trial: {
        active: false,
        ends_at: null,
      },
      billing: {
        state: 'not_configured',
        payment_state_source: null,
      },
      limits: {
        api_keys_active: 0,
        hooks_active: 0,
        retention_days: 7,
        monthly_ingest_events: 1000,
        dashboard_users: 1,
        ai_analysis_runs_per_month: 0,
      },
      usage: {
        api_keys_active: 0,
        hooks_active: 0,
        monthly_ingest_events: 0,
        ai_analysis_runs_this_month: 0,
      },
      features: {
        api_key_management: false,
        hook_management: false,
        ai_analysis: false,
        export: false,
      },
    };
  }
}
