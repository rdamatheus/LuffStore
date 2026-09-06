# LUFF Store — Arquitetura v0.1

## Separação de ambientes

A LUFF compartilha temporariamente o mesmo projeto Supabase do Personal OS por limitação de quantidade de projetos gratuitos, mas fica isolada em schemas próprios:

- `public` — Personal OS
- `luff` — dados da LUFF
- `luff_private` — funções internas de autorização e manutenção da LUFF

A intenção é manter dependências mínimas entre os contextos para facilitar futura extração da LUFF para um projeto Supabase próprio.

## Princípios

- nenhum objeto operacional da LUFF deve ser criado em `public`;
- nenhum dado do Personal OS deve ser referenciado pelas tabelas de negócio da LUFF;
- autenticação é compartilhada via `auth.users`, mas autorização da LUFF é independente em `luff.members`;
- acesso administrativo usa papéis `owner`, `manager` e `staff`;
- RLS é obrigatório em todas as tabelas do schema `luff`;
- dados públicos do site são liberados por políticas específicas, não por acesso irrestrito;
- Velo será tratado como fonte operacional futura, sem acoplamento direto do frontend ao ERP;
- tabelas de integração guardam somente metadados e mapeamentos; credenciais não devem ser armazenadas em código ou repositório.

## Modelo de catálogo

`Família → Categoria → Subcategoria → Produto → Variação`

Entidades principais:

- `catalog_families`
- `catalog_categories`
- `brands`
- `attributes`
- `attribute_values`
- `products`
- `product_variants`
- `variant_attribute_values`
- `product_media`
- `collections`
- `looks`

## Integração Velo

Estrutura criada:

- `integration_connections`
- `integration_mappings`
- `sync_runs`

Status inicial: `not_configured`.

## Segurança

A autorização utiliza `luff.members` e a função privada `luff_private.has_luff_role()`.

Tabelas administrativas exigem usuário autenticado e papel compatível. O catálogo público só libera registros explicitamente publicados/ativos.

## Migração futura para projeto separado

A separação por schema reduz o escopo da migração futura. A extração deverá incluir:

1. schema `luff`;
2. schema `luff_private`;
3. dados relacionados;
4. políticas RLS e grants;
5. Storage da LUFF, quando criado;
6. reconfiguração dos usuários e integrações no novo projeto.

O código da aplicação não deve depender de tabelas do Personal OS, permitindo trocar apenas URL/chaves/configuração do Supabase quando a LUFF for movida.
