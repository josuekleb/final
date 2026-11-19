-- Contas permanentes de teste. Reimportar este esquema mantém os mesmos acessos.
INSERT INTO usuarios (tipo,nome,email,senha_hash,telefone,documento,ativo)
VALUES
  ('cliente','Cliente de Demonstração','cliente.demo@agendly.test','$2y$10$.dLDsKJxh62wD7Vo1vZJcOgfuoHoPQMvV8xDXmGgaWJgwvLtwHmh.',NULL,NULL,1),
  ('loja','Barbearia Silva Pro','negocio.demo@agendly.test','$2y$10$0XJPtJbTdu.dLlWZZYlkZOSsT68YXiZW5qiY.7TmSlhZik8ko8JPq','11987654321',NULL,1)
ON DUPLICATE KEY UPDATE
  tipo=VALUES(tipo), nome=VALUES(nome), senha_hash=VALUES(senha_hash),
  telefone=VALUES(telefone), ativo=1;

SET @agendly_demo_store = '{"profile":{"name":"Barbearia Silva Pro","category":"Barbearia & Estética Masculina","tagline":"Especialista em visagismo, cortes e cuidados masculinos.","location":"Pinhais, São Paulo - SP","phone":"(11) 98765-4321","email":"negocio.demo@agendly.test","avatar":"","banner":""},"blocks":[{"id":"about","type":"text","title":"Sobre o estabelecimento","description":"Cortes modernos, barba na navalha e atendimento personalizado em um ambiente preparado para você.","active":true},{"id":"services","type":"services","title":"Serviços disponíveis","description":"","active":true,"items":[{"id":"haircut","name":"Corte de cabelo","description":"Corte personalizado com acabamento e finalização.","price":60,"duration":45,"active":true},{"id":"beard","name":"Barba com toalha quente","description":"Modelagem, hidratação e acabamento na navalha.","price":45,"duration":30,"active":true},{"id":"combo","name":"Combo corte + barba","description":"Corte completo e desenho da barba.","price":95,"duration":75,"active":true}]},{"id":"questions","type":"questions","title":"Antes de agendar","description":"","active":true,"items":[{"id":"style","question":"Qual estilo você gostaria de fazer?","answer":"Se quiser, conte suas referências ao profissional.","required":false}]},{"id":"hours","type":"hours","title":"Horários de atendimento","description":"Segunda a sábado, das 09:00 às 19:00.","active":true},{"id":"payment","type":"payment","title":"Formas de pagamento","description":"Pix, cartões e dinheiro. Pagamento no local.","active":true}]}';

SET @agendly_demo_store = JSON_SET(
  @agendly_demo_store,
  '$.blocks[3].schedule',
  JSON_OBJECT(
    'days', JSON_OBJECT(
      '0', JSON_OBJECT('closed', TRUE),
      '1', JSON_OBJECT('closed', FALSE, 'open', '09:00', 'close', '19:00', 'breakStart', '', 'breakEnd', ''),
      '2', JSON_OBJECT('closed', FALSE, 'open', '09:00', 'close', '19:00', 'breakStart', '', 'breakEnd', ''),
      '3', JSON_OBJECT('closed', FALSE, 'open', '09:00', 'close', '19:00', 'breakStart', '', 'breakEnd', ''),
      '4', JSON_OBJECT('closed', FALSE, 'open', '09:00', 'close', '19:00', 'breakStart', '', 'breakEnd', ''),
      '5', JSON_OBJECT('closed', FALSE, 'open', '09:00', 'close', '19:00', 'breakStart', '', 'breakEnd', ''),
      '6', JSON_OBJECT('closed', FALSE, 'open', '09:00', 'close', '19:00', 'breakStart', '', 'breakEnd', '')
    ),
    'closures', JSON_ARRAY()
  )
);

INSERT INTO negocios (usuario_id,nome,categoria,descricao,endereco,telefone,publicado,vitrine_json,rascunho_json)
SELECT id,'Barbearia Silva Pro','Barbearia & Estética Masculina',
  'Especialista em visagismo, cortes e cuidados masculinos.','Pinhais, São Paulo - SP',
  '11987654321',1,@agendly_demo_store,@agendly_demo_store
FROM usuarios WHERE email='negocio.demo@agendly.test'
ON DUPLICATE KEY UPDATE
  nome=VALUES(nome),categoria=VALUES(categoria),publicado=1,
  vitrine_json=IF(publicado=0,VALUES(vitrine_json),vitrine_json),
  rascunho_json=IF(publicado=0,VALUES(rascunho_json),rascunho_json);
