# LUFF Store — Direção Visual do Site Público

Versão: **1.1** — 2026-09-07

## Fonte de referência

A direção visual foi definida a partir dos materiais fornecidos na pasta LUFF do Google Drive, incluindo variações da marca em PNG, materiais impressos e o PDF de referência do Instagram.

## Identidade aplicada

- preto: base premium e contraste;
- dourado: assinatura, destaque e CTA;
- branco: legibilidade e respiro;
- cinza/grafite: profundidade e apoio;
- fotografia masculina real/editorial como protagonista;
- tipografia editorial nos títulos e sans-serif limpa na interface.

## Regra comercial

O site público não deve parecer painel administrativo. A prioridade é marca, produto, coleção, looks e conversão via WhatsApp.

## Home v1.1

1. Cabeçalho com marca recortada e navegação acessível;
2. Hero com fotografia real de look dentro da loja;
3. Atalho de novidades sem declarar disponibilidade inexistente;
4. Catálogo agrupado por família e categoria;
5. Produtos publicados pelo painel, sem cards fictícios;
6. Looks publicados pelo painel ou consulta pelo WhatsApp;
7. Diferenciais;
8. Sobre com fotografia real da loja;
9. Loja física e contatos configuráveis.

## Dados

- O site consulta o schema `luff` do Supabase usando chave publishable e políticas RLS.
- Categorias publicadas são carregadas do banco quando disponíveis.
- Produtos ativos e publicados substituem automaticamente os cards editoriais de contingência.
- Quando não há produtos publicados, o site mostra estado vazio e encaminha para atendimento, sem inventar peças, preços ou estoque.
- Famílias e categorias públicas são agrupadas pela taxonomia existente; categorias filhas inválidas ou órfãs são ocultadas.
- Imagens de categorias podem ser configuradas no painel. Sem foto aprovada, a categoria usa uma apresentação tipográfica neutra.
- Preço, estoque e demais dados operacionais continuam preparados para a futura integração Velo.

## Contingência

Enquanto não houver produtos publicados pelo ERP/painel, a Home utiliza fotografias editoriais reais apenas em posições institucionais e chamadas para WhatsApp, sem inventar estoque ou preço.

## Critérios de imagem

- Hero e institucional usam fotografias reais extraídas do material da LUFF.
- Fotos de produto precisam representar a categoria indicada e ter enquadramento legível.
- Montagens com múltiplos recortes, textos de arte ou produtos incompatíveis não são usadas como foto de categoria.
- Não há fotos reais adequadas atualmente para chinelos/sandálias, cuecas e meias; essas categorias aparecem sem fotografia até receberem material aprovado.
