<?php
define('NENGE',true);
use Nenge\APP as app;
header("Content-type: text/html; charset=utf-8");
include './assets/app.php';
$app = app::app();
$_G = &$app->data;
$router_list = array(
    'index'=>'',
    'install'=>$app->path->plugin.'install/index.php',
);
if(!empty($router_list[$app->router->app])){
    include $router_list[$app->router->app];
}else if(isset($router_list[$app->router->app])){
    include $app->path->routes.$app->router->app.'.php';
}