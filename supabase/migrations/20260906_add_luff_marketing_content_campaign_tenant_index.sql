-- Cobertura da FK composta marketing_content(campaign_id, tenant_id)
create index if not exists luff_marketing_content_campaign_tenant_idx
  on luff.marketing_content(campaign_id, tenant_id);
