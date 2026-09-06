# LUFF Store

Projeto digital da LUFF Store, separado dos projetos Croma Hub e Personal OS.

## Objetivo

Construir uma presença digital premium para moda masculina, começando por catálogo + WhatsApp e painel administrativo, com arquitetura preparada para futura integração com o ERP Velo e posterior evolução para e-commerce.

## Premissas aprovadas

- projeto GitHub independente;
- projeto Supabase independente;
- site público responsivo;
- painel administrativo com perfis `owner`, `manager` e `staff`;
- preços públicos no site;
- ERP Velo como futura fonte operacional de produtos, preços, variações e estoque;
- LUFF como camada editorial para fotos, descrições, SEO, destaques, coleções, looks e conteúdo;
- catálogo organizado por Família → Categoria → Subcategoria → Produto → Variações;
- identidade visual própria da LUFF: preto, grafite, branco e dourado;
- nenhuma chave, token ou segredo será versionado no repositório.

## Estrutura inicial

- `index.html` — site público inicial
- `admin/` — painel administrativo
- `css/` — identidade visual e responsividade
- `js/` — comportamento da interface
- `data/` — taxonomia inicial desacoplada da interface
- `docs/` — documentação técnica e decisões

## Fases

1. Fundação e catálogo
2. Site público e catálogo + WhatsApp
3. Conteúdo e marketing
4. CRM e indicadores
5. Integração com Velo
6. E-commerce e experiências inteligentes

## Segurança

- segredos somente em variáveis de ambiente/configuração segura;
- RLS obrigatório no Supabase para dados sensíveis;
- permissões por perfil;
- logs e rastreabilidade para ações administrativas relevantes.
