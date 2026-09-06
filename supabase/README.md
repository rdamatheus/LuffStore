# Supabase — LUFF Store

A LUFF usa temporariamente o mesmo projeto Supabase do Personal OS, com isolamento por schema.

## Schemas

- `public` — Personal OS
- `luff` — dados da LUFF Store
- `luff_private` — funções internas da LUFF

## Migrações aplicadas no Supabase

- `20260906195757_create_luff_core_schema`
- `20260906195832_secure_luff_schema`
- `20260906195916_seed_luff_taxonomy_v1`
- `20260906195941_harden_luff_updated_at_function`
- `20260906200415_expose_luff_schema_to_data_api`
- `20260906201016_add_luff_product_attribute_values`
- `20260906201730_harden_luff_rls_and_indexes`
- `add_luff_operational_modules_v1` — Site, Marketing, CRM, indicadores e dados de equipe

O SQL da etapa operacional também está versionado em:

`supabase/migrations/20260906_add_luff_operational_modules_v1.sql`

## Edge Functions LUFF

### `luff-admin-users`

Função exclusiva para provisionamento interno de usuários do LUFF Admin.

- JWT obrigatório;
- caller deve ser `owner` ativo em `luff.members`;
- cria usuário interno por e-mail/senha;
- lista apenas membros LUFF;
- altera role/status;
- permite redefinição de senha;
- impede que o Owner atual retire o próprio acesso;
- segredo administrativo permanece somente no servidor.

Fonte versionada em:

`supabase/functions/luff-admin-users/index.ts`

A função global `admin-users` pertence ao contexto do Personal OS e não deve ser reutilizada pela LUFF.

## Segurança e RLS

- tabelas expostas usam grants explícitos e RLS;
- leitura pública é limitada ao conteúdo publicável;
- acesso administrativo depende de vínculo em `luff.members`;
- `owner`, `manager` e `staff` possuem permissões distintas;
- políticas de escrita são separadas por operação;
- correlações entre entidades usam `tenant_id` explícito;
- o navegador nunca recebe `service_role` ou secret key;
- o Google Auth global não é desabilitado porque o projeto é compartilhado, mas o LUFF Admin não oferece login social.

## Módulos operacionais adicionados na v0.3

- `site_settings`
- `site_banners`
- `site_sections`
- `marketing_campaigns`
- `marketing_content`
- `customers`
- `sales_daily`

Além disso, `members` recebeu `display_name` e `email` para permitir gestão operacional da equipe sem depender da listagem pública de `auth.users`.

## Performance

Chaves estrangeiras e joins relevantes do schema `luff` possuem índices de cobertura. Índices podem aparecer como “unused” enquanto a aplicação ainda tem pouco tráfego; isso não implica remoção automática.

## Regras

- novas alterações de DDL devem ser aplicadas como migrações nomeadas;
- nunca inserir `service_role`, senha, token do Velo ou outro segredo no repositório;
- `integration_connections.config` é somente para configuração não secreta;
- credenciais futuras devem ficar em mecanismo seguro de secrets/Vault/backend;
- novas tabelas do schema `luff` devem nascer com grants mínimos e RLS antes do consumo pelo frontend;
- dados operacionais do Velo não devem ser sobrescritos manualmente pelo LUFF Admin.

## Extração futura

A LUFF não depende de tabelas de negócio do schema `public`. Para migrar para um projeto Supabase exclusivo, exportar:

1. schemas `luff` e `luff_private`;
2. dados LUFF;
3. grants e policies;
4. Edge Functions LUFF;
5. Storage LUFF;
6. secrets correspondentes;
7. usuários Auth necessários ou recriar o provisionamento interno;
8. atualizar URL/chave pública do frontend.
