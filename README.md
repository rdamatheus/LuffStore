# LUFF Store

Projeto digital da LUFF Store, com repositório e domínio de negócio próprios. A infraestrutura de dados é compartilhada com o projeto Supabase do Croma Hub, mas permanece isolada nos schemas `luff` e `luff_private`.

## Objetivo

Construir uma presença digital premium para moda masculina, começando por catálogo + WhatsApp e painel administrativo, com arquitetura preparada para futura integração com o ERP Velo e posterior evolução para e-commerce.

## Estado atual

- repositório GitHub dedicado `rdamatheus/LuffStore`;
- GitHub Pages publicado;
- painel administrativo operacional em `/admin/`;
- autenticação interna por e-mail e senha usando o Auth compartilhado do projeto Supabase do Croma Hub;
- perfis `owner`, `manager` e `staff` próprios da LUFF;
- banco LUFF isolado nos schemas `luff` e `luff_private`;
- backend centralizado no projeto Supabase `croma-hub`, sem compartilhar tabelas de negócio com a Croma ou com o Personal OS;
- projeto Supabase antigo mantido temporariamente apenas como rollback da migração;
- integração Velo preparada, ainda não configurada.

## Regra de domínio

> **Velo = fonte operacional de produto, preço, estoque e vendas. LUFF Admin = camada digital, editorial, site, marketing, CRM, usuários e integração.**

## Catálogo

A classificação segue:

```text
Família → Categoria → Subcategoria → Produto → Variações
```

Marca, cor, tamanho, material, coleção e look não são tratados como categorias.

## Estrutura

- `index.html` — site público;
- `admin/` — painel administrativo;
- `css/` — identidade visual e responsividade;
- `js/` — comportamento da interface;
- `docs/` — arquitetura, autenticação, operação e histórico;
- `supabase/migrations/` — migrações versionadas da LUFF;
- `supabase/functions/` — Edge Functions exclusivas da LUFF.

## Painel v0.3

Módulos operacionais:

- Visão geral;
- Famílias e categorias;
- Produtos — edição da camada digital;
- Marcas;
- Atributos;
- Coleções;
- Looks;
- Site e banners;
- Marketing e conteúdo;
- Clientes / CRM;
- Indicadores preparados para Velo;
- Integrações;
- Equipe e permissões;
- Logs de auditoria.

## Documentação principal

- `docs/ARCHITECTURE.md` — arquitetura geral;
- `docs/AUTHENTICATION.md` — autenticação interna;
- `docs/OPERATION_MANUAL.md` — especificação funcional e manual operacional da v0.3;
- `docs/CHANGELOG.md` — histórico de alterações;
- `supabase/README.md` — regras e histórico do banco.

## Segurança

- nenhuma chave administrativa, senha ou token do Velo é versionado;
- apenas a chave pública do Supabase é usada no frontend;
- RLS obrigatório nas tabelas sensíveis;
- permissões por perfil verificadas no banco;
- criação de usuários internos passa por Edge Function protegida `luff-admin-users`;
- `luff_private` não é exposto pela Data API;
- logs e rastreabilidade para ações administrativas relevantes;
- compartilhar o projeto Supabase não dá acesso cruzado aos dados da Croma ou do Personal OS.

## Fases

1. Fundação e catálogo — concluída;
2. Painel administrativo operacional — concluída na v0.3;
3. Migração para infraestrutura central do Croma Hub — concluída;
4. Site público conectado ao catálogo — próxima etapa;
5. Homologação e integração Velo;
6. CRM e indicadores enriquecidos por vendas;
7. E-commerce e experiências inteligentes.
