<?php
	header("Expires: 0"); // 向后兼容HTTP/1.0   
	header("Pragma: no-cache"); // 支持HTTP/1.1   
	header("Cache-Control: no-cache,no-store,max-age=0,s-maxage=0,must-revalidate");
	header("Content-type: application/json");
	header("Access-Control-Allow-Origin:*");
//header("Access-Control-Allow-Methods:retroarch.nenge.net,*);
//header("Access-Control-Allow-Origin:retroarch.nenge.net,*");
$json = file_get_contents('php://input');
if ($json) {
	function getRequest($url, $post = false, $cookie = array(), $refer = "", $timeout = 5)
	{
		//$url, $post = array(), $timeout = 30, $times = 1$header = []
		$ssl = stripos($url, 'https://') === 0 ? true : false;
		$curlObj = curl_init();
		$header = [];
		$options = [
			CURLOPT_URL => $url,
			CURLOPT_RETURNTRANSFER => 1,
			CURLOPT_FOLLOWLOCATION => 1,
			CURLOPT_AUTOREFERER => 1,
			CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; MSIE 5.01; Windows NT 5.0)',
			CURLOPT_TIMEOUT => $timeout,
			CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_0,
			CURLOPT_HTTPHEADER => ['Expect:'],
			//'CURLOPT_IPRESOLVE' => CURL_IPRESOLVE_V4,
			//'CURLOPT_REFERER' => $url, //伪造来路
		];
		if ($refer) {
			$options[CURLOPT_REFERER] = $refer;
		}
		if ($ssl) {
			//support https
			$options[CURLOPT_SSL_VERIFYHOST] = false;
			$options[CURLOPT_SSL_VERIFYPEER] = false;
		}
		if (is_array($cookie)) $cookie = http_build_query($cookie);
		if ($cookie) {
			$header = array('Content-type: application/x-www-form-urlencoded', 'X-Requested-With: XMLHttpRequest');
			$header[] = "Cookie: $cookie";
		}
		if ($post) {
			$options[CURLOPT_POST] = 1;
			if (is_array($post)) {
				$options[CURLOPT_POSTFIELDS] =  json_encode($post);
			} else {
				$header = array(
					'Content-Type:application/json;charset=utf-8',
					'Content-Length:' . strlen($post), 'accept:application/json'
				);
				$options[CURLOPT_POSTFIELDS] =  $post;
			}
		}
		$options[CURLOPT_HTTPHEADER] = $header;
		curl_setopt_array($curlObj, $options);
		$returnData = curl_exec($curlObj);
		if (curl_errno($curlObj)) {
			//error message
			$returnData = json_encode(array('error' => curl_error($curlObj)));
			//echo $returnData;
			//exit;
		}
		curl_close($curlObj);
		return $returnData;
	}
	$json = json_decode($json, true);
	$json['client_id'] = 'b2b8974cb49ea9ae7d10';
	$json['client_secret'] = '4618bde13d3fa57c5fb53692ad65d483baec6204';
	echo getRequest('https://github.com/login/oauth/access_token/', json_encode($json));
}else{
	echo '{"error":"nothing post"}';
}
exit;
