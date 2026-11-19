<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
$action=(string)($_GET['action']??'');
$body=json_decode((string)file_get_contents('php://input'),true); $body=is_array($body)?$body:[];
$publicActions=['login','register','request-reset','reset-password'];
if(!in_array($action,$publicActions,true)) need_user();
if(($_SERVER['REQUEST_METHOD']??'')==='POST'&&!in_array($action,$publicActions,true)) require_csrf();
try {
 $pdo=db();
 $rateLimits=['login'=>[10,900],'register'=>[5,3600],'request-reset'=>[5,900],'reset-password'=>[8,900]];
 if(isset($rateLimits[$action])) enforce_api_rate_limit($pdo,$action,$rateLimits[$action][0],$rateLimits[$action][1]);
 if(!in_array($action,$publicActions,true)){ $sessionUser=need_user(); $active=$pdo->prepare('SELECT id FROM usuarios WHERE id=? AND ativo=1'); $active->execute([$sessionUser['id']]); if(!$active->fetch()){ $_SESSION=[]; session_destroy(); error_out(401,'Your account is no longer active.'); } }
 switch($action) {
  case 'me': method_is('GET'); $u=need_user();$q=$pdo->prepare('SELECT id,tipo,nome,email,telefone,bio FROM usuarios WHERE id=? AND ativo=1');$q->execute([$u['id']]);$current=$q->fetch();if(!$current){$_SESSION=[];session_destroy();error_out(401,'Your account is no longer active.');}out(['user'=>$current,'csrf'=>$_SESSION['csrf_token']??'']);
  case 'profile-save': method_is('POST');$u=need_user();$name=trim((string)($body['nome']??''));$phone=preg_replace('/\D+/','',(string)($body['telefone']??''));$bio=trim((string)($body['bio']??''));if(mb_strlen($name)<2||($phone!==''&&strlen($phone)<10))error_out(422,'Confira o nome e o telefone.');$pdo->prepare('UPDATE usuarios SET nome=?,telefone=?,bio=? WHERE id=?')->execute([mb_substr($name,0,160),$phone?:null,mb_substr($bio,0,2000),$u['id']]);$_SESSION['agendly_user']['nome']=$name;out(['user'=>me()]);
  case 'request-reset':
   method_is('POST');$email=mb_strtolower(trim((string)($body['email']??'')));if(!filter_var($email,FILTER_VALIDATE_EMAIL))error_out(422,'Informe um e-mail válido.');$q=$pdo->prepare('SELECT id FROM usuarios WHERE email=? AND ativo=1');$q->execute([$email]);$account=$q->fetch();if($account){$token=bin2hex(random_bytes(32));$pdo->prepare('DELETE FROM tokens_recuperacao WHERE usuario_id=?')->execute([$account['id']]);$pdo->prepare('INSERT INTO tokens_recuperacao(usuario_id,token_hash,expira_em) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))')->execute([$account['id'],hash('sha256',$token)]);$root=rtrim(dirname(dirname($_SERVER['SCRIPT_NAME']??'/p4/api/index.php')),'/');$scheme=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')?'https':'http';$base=$config['base_url']?:$scheme.'://'.($_SERVER['HTTP_HOST']??'localhost').$root;$link=rtrim($base,'/').'/redefinirsenha.html?token='.rawurlencode($token);$subject='Agendly - redefinicao de senha';$message="Olá,\n\nUse o link abaixo para criar uma nova senha. Ele expira em 30 minutos.\n$link\n\nSe não solicitou a alteração, ignore este e-mail.";$headers="From: Agendly <".$config['mail_from'].">\r\nContent-Type: text/plain; charset=UTF-8";if(!@mail($email,$subject,$message,$headers))error_log('Agendly: configure o envio de e-mail do PHP para habilitar recuperação de senha.');}out(['message'=>'Se o endereço estiver cadastrado e o envio de e-mail estiver configurado, você receberá um link válido por 30 minutos.']);
  case 'reset-password':
   method_is('POST');$token=(string)($body['token']??'');$password=(string)($body['senha']??'');if(strlen($token)!==64||strlen($password)<8||strlen($password)>72)error_out(422,'Link ou senha inválidos. Use uma senha com pelo menos 8 caracteres.');$pdo->beginTransaction();$q=$pdo->prepare('SELECT id,usuario_id FROM tokens_recuperacao WHERE token_hash=? AND usado_em IS NULL AND expira_em>NOW() FOR UPDATE');$q->execute([hash('sha256',$token)]);$row=$q->fetch();if(!$row)error_out(400,'Este link expirou ou já foi usado. Solicite outro.');$pdo->prepare('UPDATE usuarios SET senha_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$row['usuario_id']]);$pdo->prepare('DELETE FROM tokens_recuperacao WHERE usuario_id=?')->execute([$row['usuario_id']]);$pdo->commit();out(['ok'=>true]);
  case 'register':
   method_is('POST'); $type=(string)($body['tipo']??''); $name=trim((string)($body['nome']??'')); $email=mb_strtolower(trim((string)($body['email']??''))); $pass=(string)($body['senha']??''); $phone=preg_replace('/\D+/','',(string)($body['telefone']??''));
   if(!in_array($type,['cliente','loja'],true)||mb_strlen($name)<2||mb_strlen($name)>160||mb_strlen($email)>190||!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($pass)<8||strlen($pass)>72||strlen($phone)<10||strlen($phone)>11) error_out(422,'Confira seus dados, informe um telefone válido e use uma senha com pelo menos 8 caracteres.');
   $doc=preg_replace('/\D+/','',(string)($body['documento']??'')); if(!valid_document($doc,$type)) error_out(422,'Documento inválido.');
   $pdo->beginTransaction(); $q=$pdo->prepare('INSERT INTO usuarios(tipo,nome,email,senha_hash,telefone,documento) VALUES(?,?,?,?,?,?)'); $q->execute([$type,$name,$email,password_hash($pass,PASSWORD_DEFAULT),$phone,$doc]); $id=(int)$pdo->lastInsertId();
   if($type==='loja') { $store=['profile'=>['name'=>$name,'category'=>'Serviços','tagline'=>'','location'=>'','phone'=>$phone,'email'=>$email,'avatar'=>'','banner'=>''],'blocks'=>[]]; $json=json_encode($store,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); $pdo->prepare('INSERT INTO negocios(usuario_id,nome,telefone,vitrine_json,rascunho_json) VALUES(?,?,?,?,?)')->execute([$id,$name,$phone,$json,$json]); }
   $pdo->commit(); out(['ok'=>true],201);
  case 'login':
   method_is('POST'); $email=mb_strtolower(trim((string)($body['email']??''))); $q=$pdo->prepare('SELECT id,tipo,nome,email,senha_hash,ativo FROM usuarios WHERE email=?'); $q->execute([$email]); $u=$q->fetch();
   if(!$u||!(int)$u['ativo']||!password_verify((string)($body['senha']??''),$u['senha_hash'])||(!empty($body['tipo'])&&$body['tipo']!==$u['tipo'])) error_out(401,'E-mail ou senha inválidos.'); sign_in($u); out(['user'=>me(),'csrf'=>$_SESSION['csrf_token']]);
  case 'logout': method_is('POST'); $_SESSION=[]; session_destroy(); out(['ok'=>true]);
  case 'businesses':
   method_is('GET'); $rows=$pdo->query("SELECT n.*,u.email FROM negocios n JOIN usuarios u ON u.id=n.usuario_id WHERE n.publicado=1 AND u.ativo=1 ORDER BY n.atualizado_em DESC")->fetchAll(); out(['businesses'=>array_map('public_store',$rows)]);
  case 'store':
   method_is('GET'); $businessKey=trim((string)($_GET['business']??(me()['email']??''))); $byId=preg_match('/^\d+$/D',$businessKey)===1&&((int)$businessKey>0); $draft=($_GET['draft']??'')==='1'; $q=$pdo->prepare('SELECT n.*,u.email FROM negocios n JOIN usuarios u ON u.id=n.usuario_id WHERE (n.id=? OR u.email=?) AND (n.publicado=1 OR u.id=?)'); $q->execute([$byId?(int)$businessKey:0,$byId?'':mb_strtolower($businessKey),me()['id']??0]); $r=$q->fetch(); if(!$r) error_out(404,'Esta loja ainda não foi publicada.'); if($draft&&(!me()||(int)$r['usuario_id']!==(int)me()['id']))error_out(403,'Acesso negado.'); if(!$draft&&!(int)$r['publicado'])error_out(404,'Esta loja ainda não foi publicada.'); if($draft)$r['vitrine_json']=$r['rascunho_json']; out(['store'=>public_store($r)]);
  case 'availability':
   method_is('GET');
   $businessKey=trim((string)($_GET['business']??(me()['email']??'')));
   $byId=preg_match('/^\d+$/D',$businessKey)===1&&((int)$businessKey>0);
   $draft=($_GET['draft']??'')==='1';
   $q=$pdo->prepare('SELECT n.id,n.usuario_id,n.publicado,n.vitrine_json,n.rascunho_json FROM negocios n JOIN usuarios u ON u.id=n.usuario_id WHERE (n.id=? OR u.email=?) AND (n.publicado=1 OR u.id=?) AND u.ativo=1');
   $q->execute([$byId?(int)$businessKey:0,$byId?'':mb_strtolower($businessKey),me()['id']??0]);
   $business=$q->fetch();
   if(!$business||($draft&&(!me()||me()['tipo']!=='loja'||(int)$business['usuario_id']!==(int)me()['id'])))error_out(404,'Estabelecimento indisponível.');
   if(!$draft&&!(int)$business['publicado'])error_out(404,'Estabelecimento indisponível.');
   $store=json_decode($draft?$business['rascunho_json']:$business['vitrine_json'],true)?:[];
   $serviceName=mb_strtolower(trim((string)($_GET['service']??'')));
   $service=null;
   foreach((is_array($store['blocks']??null)?$store['blocks']:[]) as $block)if(is_array($block)&&($block['type']??'')==='services'&&!empty($block['active']))foreach((is_array($block['items']??null)?$block['items']:[]) as $item)if(is_array($item)&&!empty($item['active'])&&mb_strtolower(trim((string)($item['name']??'')))===$serviceName)$service=$item;
   if(!$service)error_out(422,'Esse serviço não está disponível.');
   $professional=resolve_professional($store,trim((string)($_GET['professional']??'')));
   $from=(string)($_GET['from']??date('Y-m-d'));
   $days=max(1,min(31,(int)($_GET['days']??14)));
   if(!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$from)||!checkdate((int)substr($from,5,2),(int)substr($from,8,2),(int)substr($from,0,4))||$from<date('Y-m-d'))error_out(422,'Período de disponibilidade inválido.');
   $first=new DateTimeImmutable($from);
   $afterLast=$first->modify('+'.$days.' days');
   $excludeId=max(0,(int)($_GET['exclude']??0));
   $appointmentQuery="SELECT id,inicio,fim,profissional_nome FROM agendamentos WHERE negocio_id=? AND status IN ('pendente','confirmado') AND inicio<? AND fim>?";
   $appointmentParams=[$business['id'],$afterLast->format('Y-m-d 00:00:00'),$first->format('Y-m-d 00:00:00')];
   if($excludeId>0){$appointmentQuery.=' AND id<>?';$appointmentParams[]=$excludeId;}
   $q=$pdo->prepare($appointmentQuery);
   $q->execute($appointmentParams);
   $appointments=$q->fetchAll();
   $duration=max(5,min(720,(int)($service['duration']??30)));
   $now=new DateTimeImmutable();
   $result=[];
   for($offset=0;$offset<$days;$offset++){
    $date=$first->modify('+'.$offset.' days')->format('Y-m-d');
    $hours=business_hours_for_date($store,$date);
    $slots=[];
    if($hours){
     for($minute=$hours['open'];$minute+$duration<=$hours['close'];$minute+=30){
      $time=sprintf('%02d:%02d',intdiv($minute,60),$minute%60);
      $endMinute=$minute+$duration;
      $endTime=sprintf('%02d:%02d',intdiv($endMinute,60),$endMinute%60);
      if(!valid_operating_slot($store,$date,$time,$endTime)||new DateTimeImmutable($date.' '.$time)<=$now)continue;
      $startAt=strtotime($date.' '.$time.':00');
      $endAt=strtotime($date.' '.$endTime.':00');
      $conflict=false;
      foreach($appointments as $appointment){
       $otherProfessional=(string)($appointment['profissional_nome']??'Equipe do estabelecimento');
       if($professional!=='Equipe do estabelecimento'&&$otherProfessional!=='Equipe do estabelecimento'&&$otherProfessional!==$professional)continue;
       if($startAt<strtotime($appointment['fim'])&&$endAt>strtotime($appointment['inicio'])){$conflict=true;break;}
      }
      if(!$conflict)$slots[]=$time;
     }
    }
    $result[]=['date'=>$date,'slots'=>$slots];
   }
   out(['days'=>$result]);
  case 'store-save':
   method_is('POST'); $u=need_user('loja'); $s=$body['store']??null; if(!is_array($s)||!is_array($s['profile']??null)||!is_array($s['blocks']??null)) error_out(422,'Conteúdo da vitrine inválido.'); $json=json_encode($s,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); if(strlen($json)>1800000) error_out(413,'Reduza o tamanho das imagens da vitrine.'); $p=$s['profile'];foreach(['avatar','banner'] as $imageField)if(!valid_store_image($p[$imageField]??''))error_out(422,'Use imagens JPEG enviadas pelo editor da vitrine.');
   if(!empty($body['publish'])) { $q=$pdo->prepare('UPDATE negocios SET nome=?,categoria=?,descricao=?,endereco=?,telefone=?,rascunho_json=?,vitrine_json=?,publicado=1 WHERE usuario_id=?'); $q->execute([mb_substr(trim((string)($p['name']??'Meu negócio')),0,160),mb_substr(trim((string)($p['category']??'Serviços')),0,100),mb_substr(trim((string)($p['tagline']??'')),0,500),mb_substr(trim((string)($p['location']??'')),0,255),preg_replace('/\D+/','',(string)($p['phone']??''))?:null,$json,$json,$u['id']]); }
   else { $pdo->prepare('UPDATE negocios SET rascunho_json=? WHERE usuario_id=?')->execute([$json,$u['id']]); } out(['ok'=>true]);
  case 'appointments':
   method_is('GET'); $u=need_user();
   if($u['tipo']==='cliente') { $q=$pdo->prepare('SELECT a.id,a.inicio,a.fim,a.status,a.profissional_nome,n.id AS business_id,n.nome AS negocio,COALESCE(a.servico_nome,s.nome) AS servico,COALESCE(a.preco_final,s.preco) AS preco FROM agendamentos a JOIN negocios n ON n.id=a.negocio_id JOIN servicos s ON s.id=a.servico_id WHERE a.cliente_id=? ORDER BY a.inicio DESC'); $q->execute([$u['id']]); }
   else { $q=$pdo->prepare('SELECT a.id,a.inicio,a.fim,a.status,a.profissional_nome,n.nome AS negocio,COALESCE(a.servico_nome,s.nome) AS servico,COALESCE(a.preco_final,s.preco) AS preco,COALESCE(c.nome,a.cliente_nome) AS cliente,COALESCE(c.email,a.cliente_email) AS email,COALESCE(c.telefone,a.cliente_telefone) AS telefone FROM agendamentos a JOIN negocios n ON n.id=a.negocio_id JOIN servicos s ON s.id=a.servico_id LEFT JOIN usuarios c ON c.id=a.cliente_id WHERE n.usuario_id=? ORDER BY a.inicio'); $q->execute([$u['id']]); }
   out(['appointments'=>$q->fetchAll()]);
  case 'appointment-create':
   method_is('POST'); $u=need_user('cliente'); $businessKey=trim((string)($body['business']??'')); $byId=preg_match('/^\d+$/D',$businessKey)===1&&((int)$businessKey>0); $serviceName=trim((string)($body['service']??'')); $requestedProfessional=trim((string)($body['professional']??'')); $date=(string)($body['date']??''); $time=(string)($body['time']??'');
   if(!valid_future_slot($date,$time)) error_out(422,'Escolha uma data e horário futuros.');
   $lookup=$pdo->prepare('SELECT n.id FROM negocios n JOIN usuarios u ON u.id=n.usuario_id WHERE (n.id=? OR u.email=?) AND n.publicado=1 AND u.ativo=1');$lookup->execute([$byId?(int)$businessKey:0,$byId?'':mb_strtolower($businessKey)]);$businessId=(int)$lookup->fetchColumn();if(!$businessId)error_out(404,'Estabelecimento indisponível.');
   $q=$pdo->prepare('SELECT GET_LOCK(?,5)'); $lock='agendly:'.substr(hash('sha256',$businessId.$date),0,48); $q->execute([$lock]); if((int)$q->fetchColumn()!==1)error_out(409,'Tente novamente em instantes.');
   $pdo->beginTransaction(); try {    $q=$pdo->prepare('SELECT n.id,n.vitrine_json FROM negocios n JOIN usuarios u ON u.id=n.usuario_id WHERE n.id=? AND n.publicado=1 AND u.ativo=1');$q->execute([$businessId]);$business=$q->fetch();if(!$business)error_out(404,'Estabelecimento indisponível.');$store=json_decode($business['vitrine_json'],true)?:[];$professional=resolve_professional($store,$requestedProfessional);$service=null;
    foreach(($store['blocks']??[]) as $block)if(($block['type']??'')==='services'&&!empty($block['active']))foreach(($block['items']??[]) as $item)if(!empty($item['active'])&&mb_strtolower(trim((string)($item['name']??'')))===mb_strtolower($serviceName))$service=$item;
    if(!$service)error_out(422,'Esse serviço não está disponível. Atualize a página.');$start=$date.' '.$time.':00';$duration=max(5,min(720,(int)($service['duration']??30)));$end=date('Y-m-d H:i:s',strtotime($start)+$duration*60);if(!valid_operating_slot($store,$date,$time,date('H:i',strtotime($end))))error_out(422,'Esse horário está fora do expediente ou em um dia de fechamento.');
    $q=$pdo->prepare("SELECT id FROM agendamentos WHERE negocio_id=? AND status IN ('pendente','confirmado') AND inicio<? AND fim>? AND (?='Equipe do estabelecimento' OR profissional_nome=? OR profissional_nome='Equipe do estabelecimento') FOR UPDATE");$q->execute([$business['id'],$end,$start,$professional,$professional]);if($q->fetch())error_out(409,'Esse horário acabou de ser reservado. Escolha outro.');
    $q=$pdo->prepare('INSERT INTO servicos(negocio_id,nome,preco,duracao_minutos) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),preco=VALUES(preco),duracao_minutos=VALUES(duracao_minutos),ativo=1');$q->execute([$business['id'],mb_substr($serviceName,0,120),max(0,(float)($service['price']??0)),$duration]);$serviceId=(int)$pdo->lastInsertId();
    $price=max(0,(float)($service['price']??0));    $q=$pdo->prepare("INSERT INTO agendamentos(cliente_id,negocio_id,servico_id,servico_nome,profissional_nome,preco_final,inicio,fim,status,observacoes) VALUES(?,?,?,?,?,?,?,?,'confirmado',?)");$q->execute([$u['id'],$business['id'],$serviceId,$serviceName,$professional,$price,$start,$end,trim((string)($body['observations']??''))]);$id=(int)$pdo->lastInsertId();
    foreach(($body['answers']??[]) as $a)if(is_array($a)&&trim((string)($a['answer']??''))!=='')$pdo->prepare('INSERT INTO respostas_agendamento(agendamento_id,pergunta,resposta) VALUES(?,?,?)')->execute([$id,mb_substr((string)($a['question']??''),0,255),trim((string)$a['answer'])]);$pdo->commit();out(['ok'=>true,'id'=>$id],201);
   } finally { $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]); }
  case 'manual-appointment-create':
   method_is('POST');$u=need_user('loja');$name=trim((string)($body['client']??''));$phone=preg_replace('/\D+/','',(string)($body['phone']??''));$serviceName=trim((string)($body['service']??''));$requestedProfessional=trim((string)($body['professional']??''));$date=(string)($body['date']??'');$time=(string)($body['time']??'');if(mb_strlen($name)<2||strlen($phone)<10||!valid_future_slot($date,$time))error_out(422,'Confira os dados e escolha um horário futuro.');
   $q=$pdo->prepare('SELECT n.id,n.nome,n.rascunho_json FROM negocios n WHERE n.usuario_id=?');$q->execute([$u['id']]);$business=$q->fetch();if(!$business)error_out(404,'Estabelecimento não encontrado.');$store=json_decode($business['rascunho_json'],true)?:[];$professional=resolve_professional($store,$requestedProfessional);$service=null;foreach(($store['blocks']??[])as $block)if(($block['type']??'')==='services')foreach(($block['items']??[])as $item)if(!empty($item['active'])&&mb_strtolower((string)$item['name'])===mb_strtolower($serviceName))$service=$item;if(!$service)error_out(422,'Serviço não encontrado na vitrine.');
   $lock='agendly:'.substr(hash('sha256',$business['id'].$date),0,48);$q=$pdo->prepare('SELECT GET_LOCK(?,5)');$q->execute([$lock]);if((int)$q->fetchColumn()!==1)error_out(409,'Tente novamente em instantes.');$pdo->beginTransaction();$start=$date.' '.$time.':00';$duration=max(5,min(720,(int)($service['duration']??30)));$end=date('Y-m-d H:i:s',strtotime($start)+$duration*60);if(!valid_operating_slot($store,$date,$time,date('H:i',strtotime($end))))error_out(422,'Esse horário está fora do expediente ou em um dia de fechamento.');$q=$pdo->prepare("SELECT id FROM agendamentos WHERE negocio_id=? AND status IN ('pendente','confirmado') AND inicio<? AND fim>? AND (?='Equipe do estabelecimento' OR profissional_nome=? OR profissional_nome='Equipe do estabelecimento') FOR UPDATE");$q->execute([$business['id'],$end,$start,$professional,$professional]);if($q->fetch())error_out(409,'Esse horário já está reservado.');$price=(float)($service['price']??0);$q=$pdo->prepare('INSERT INTO servicos(negocio_id,nome,preco,duracao_minutos) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),preco=VALUES(preco),duracao_minutos=VALUES(duracao_minutos),ativo=1');$q->execute([$business['id'],$serviceName,$price,$duration]);$sid=(int)$pdo->lastInsertId();$q=$pdo->prepare("INSERT INTO agendamentos(cliente_id,cliente_nome,cliente_telefone,negocio_id,servico_id,servico_nome,profissional_nome,preco_final,inicio,fim,status,observacoes) VALUES(NULL,?,?,?,?,?,?,?,?,?,'confirmado',?)");$q->execute([$name,$phone,$business['id'],$sid,$serviceName,$professional,$price,$start,$end,trim((string)($body['notes']??''))]);$id=(int)$pdo->lastInsertId();$pdo->commit();$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);out(['ok'=>true,'id'=>$id],201);
  case 'appointment-reschedule':
   method_is('POST'); $u=need_user(); $id=(int)($body['id']??0); $date=(string)($body['date']??''); $time=(string)($body['time']??'');
   if($id<1||!valid_future_slot($date,$time)) error_out(422,'Choose a future date and time.');
   if($u['tipo']==='cliente') { $q=$pdo->prepare("SELECT a.negocio_id,a.inicio,a.fim,a.status,a.profissional_nome,n.vitrine_json,n.rascunho_json FROM agendamentos a JOIN negocios n ON n.id=a.negocio_id WHERE a.id=? AND a.cliente_id=?"); $q->execute([$id,$u['id']]); }
   else { $q=$pdo->prepare("SELECT a.negocio_id,a.inicio,a.fim,a.status,a.profissional_nome,n.vitrine_json,n.rascunho_json FROM agendamentos a JOIN negocios n ON n.id=a.negocio_id WHERE a.id=? AND n.usuario_id=?"); $q->execute([$id,$u['id']]); }
   $appointment=$q->fetch(); if(!$appointment||!in_array($appointment['status'],['pendente','confirmado'],true)) error_out(404,'Appointment cannot be rescheduled.');
   $scheduleStore=json_decode($u['tipo']==='loja'?$appointment['rascunho_json']:$appointment['vitrine_json'],true)?:[];
   $lock='agendly:'.substr(hash('sha256',$appointment['negocio_id'].$date),0,48); $q=$pdo->prepare('SELECT GET_LOCK(?,5)'); $q->execute([$lock]); if((int)$q->fetchColumn()!==1) error_out(409,'Try again in a moment.');
   try { $pdo->beginTransaction(); $start=$date.' '.$time.':00'; $duration=max(5,(int)round((strtotime($appointment['fim'])-strtotime($appointment['inicio']))/60)); $end=date('Y-m-d H:i:s',strtotime($start)+$duration*60); if(!valid_operating_slot($scheduleStore,$date,$time,date('H:i',strtotime($end))))error_out(422,'The selected time is outside business hours or falls on a closure date.'); $q=$pdo->prepare("SELECT id FROM agendamentos WHERE negocio_id=? AND id<>? AND status IN ('pendente','confirmado') AND inicio<? AND fim>? AND (?='Equipe do estabelecimento' OR profissional_nome=? OR profissional_nome='Equipe do estabelecimento') FOR UPDATE"); $q->execute([$appointment['negocio_id'],$id,$end,$start,$appointment['profissional_nome'],$appointment['profissional_nome']]); if($q->fetch()) error_out(409,'That time was just booked. Choose another.'); $q=$pdo->prepare("UPDATE agendamentos SET inicio=?,fim=? WHERE id=? AND status IN ('pendente','confirmado')"); $q->execute([$start,$end,$id]); if(!$q->rowCount()) error_out(409,'This appointment changed. Reload and try again.'); $pdo->commit(); out(['ok'=>true]); }
   finally { $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]); }
  case 'appointment-status':
   method_is('POST');$u=need_user();$id=(int)($body['id']??0);$status=(string)($body['status']??'');if(!in_array($status,['confirmado','cancelado','concluido'],true))error_out(422,'Status inválido.');
   if($u['tipo']==='cliente') {if($status!=='cancelado')error_out(403,'Ação não permitida.');$q=$pdo->prepare("UPDATE agendamentos SET status=? WHERE id=? AND cliente_id=? AND inicio>NOW() AND status IN ('pendente','confirmado')");}
   else $q=$pdo->prepare("UPDATE agendamentos a JOIN negocios n ON n.id=a.negocio_id SET a.status=? WHERE a.id=? AND n.usuario_id=? AND a.status IN ('pendente','confirmado')");$q->execute([$status,$id,$u['id']]);if(!$q->rowCount())error_out(404,'Agendamento não encontrado ou já encerrado.');out(['ok'=>true]);
  case 'support':
   method_is('POST'); $name=trim((string)($body['nome']??''));$email=mb_strtolower(trim((string)($body['email']??'')));$subject=trim((string)($body['assunto']??''));$message=trim((string)($body['mensagem']??'')); if(mb_strlen($name)<2||!filter_var($email,FILTER_VALIDATE_EMAIL)||mb_strlen($subject)<3||mb_strlen($message)<10) error_out(422,'Preencha todos os campos corretamente.'); $u=me(); $pdo->prepare('INSERT INTO mensagens_suporte(usuario_id,nome,email,assunto,mensagem) VALUES(?,?,?,?,?)')->execute([$u['id']??null,$name,$email,mb_substr($subject,0,160),$message]); out(['ok'=>true],201);
  default: error_out(404,'Operação não encontrada.');
 }
} catch(PDOException $e) { if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack(); if($e->getCode()==='23000')error_out(409,'Já existe uma conta com esses dados.'); error_log('Agendly DB: '.$e->getMessage()); error_out(500,'Não foi possível acessar o banco. Confira a configuração da P4 no XAMPP.'); }
catch(Throwable $e) { if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack(); error_log('Agendly API: '.$e->getMessage()); error_out(500,'Ocorreu um erro inesperado.'); }
