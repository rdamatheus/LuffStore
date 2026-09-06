# LUFF Store — Direção Visual do Site Público

Versão: **1.0** — 2026-09-06

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

## Home v1

1. Cabeçalho e navegação;
2. Hero comercial sem foto de fachada;
3. Banner **“Coleção de Verão — em breve”**;
4. Categorias;
5. Produtos/destaques;
6. Looks;
7. Diferenciais;
8. Sobre;
9. Loja física e contatos.

## Dados

- O site consulta o schema `luff` do Supabase usando chave publishable e políticas RLS.
- Categorias publicadas são carregadas do banco quando disponíveis.
- Produtos ativos e publicados substituem automaticamente os cards editoriais de contingência.
- Preço, estoque e demais dados operacionais continuam preparados para a futura integração Velo.

## Contingência

Enquanto não houver produtos publicados pelo ERP/painel, a Home utiliza imagens editoriais da LUFF e chamadas para WhatsApp, sem inventar estoque ou preço.
