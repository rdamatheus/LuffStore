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

O histórico completo e o SQL efetivamente aplicado permanecem registrados em `supabase_migrations.schema_migrations` no banco.

## Segurança e RLS

- tabelas expostas usam grants explícitos e RLS;
- leitura pública é limitada ao catálogo publicável;
- acesso administrativo depende de vínculo em `luff.members`;
- `owner`, `manager` e `staff` possuem permissões distintas;
- políticas de escrita são separadas por `INSERT`, `UPDATE` e `DELETE`, evitando que uma política de escrita `FOR ALL` amplie ou duplique a avaliação de `SELECT`;
- correlações entre entidades públicas usam `tenant_id` explícito para impedir associação cruzada entre tenants.

## Performance

Chaves estrangeiras e joins relevantes do schema `luff` possuem índices de cobertura. O advisor pode marcar índices como “unused” enquanto a aplicação ainda não possui volume/tráfego; isso não é motivo para remoção automática.

## Regras

- novas alterações de DDL devem ser aplicadas como migrações nomeadas;
- nunca inserir `service_role`, senha, token do Velo ou outro segredo no repositório;
- `integration_connections.config` é somente para configuração não secreta;
- credenciais futuras devem ficar em mecanismo seguro de secrets/Vault/backend;
- novas tabelas do schema `luff` devem nascer com grants mínimos e RLS antes de serem consumidas pelo frontend.

## Extração futura

A LUFF não depende de tabelas de negócio do schema `public`. Para migrar para um projeto Supabase exclusivo, exportar os schemas `luff` e `luff_private`, dados LUFF, grants/policies, Storage e funções/secrets correspondentes.
