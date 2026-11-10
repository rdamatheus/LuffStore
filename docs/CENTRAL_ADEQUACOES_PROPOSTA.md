# Central de Adequações — LUFF Store / Chão de Giz

Estado: proposta em branch isolada, não implementada.

Reutilizar o painel /admin, módulos Site e banners, Marketing e conteúdo, Equipe e permissões e luff.audit_logs, após validar esquema e RLS. Não duplicar produtos, preços ou estoque, nem presumir integração Velo/Nuvemshop ativa.

Propor interface com registros de melhorias executadas, evidências e versões, propostas pendentes e aprovação humana obrigatória para alterações críticas. Campos: marca, tipo, origem/agente, responsável, escopo, risco, impacto, estado, decisão, evidência, data e versão. Não permitir aprovação pelo agente proponente. Separar manuais da LUFF e Chão de Giz por público, nicho, tom, identidade, canais e histórico. Preparar artes e banners para publicação manual, sem postagem automática.

Critérios de aceite: mapear contratos e tabelas existentes; testar sessão real por papéis owner/manager/staff; preservar trilha de auditoria; validar que alterações críticas não são executadas sem aprovação; testar mobile, links, imagens e regressões. Nenhuma migração, deploy, escrita de dados ou funcionalidade nova nesta etapa.
