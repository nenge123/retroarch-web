<?php
namespace Nenge {
    use Nenge\database;
    use Nenge\template;
    use Nenge\plugin;
    class APP
    {
        public static $_app;
        public static $version = 1.0;
        public $site;
        public $path;
        public $conf;
        public $lang;
        public $router;
        public $db;
        public $data = array(
            'uid' => 0,
            'gid' => 0,
            'scss'=>null,
            'user' => array(),
            'cache' => array(),
            'site' => array(),
            'GET' => array(),
        );
        public function __construct()
        {
            self::$_app = $this;
            $this->get_env_data();
            $this->get_config_data();
            $this->get_lang();
            define('DEBUG',1);
            if(!empty($this->conf->db)){
                $this->get_database();
                $this->get_cache_data();
                $this->get_session_data();
            }
            spl_autoload_register(array($this,'register_autoload'),true,true);
        }
        public static function app()
        {
            if (empty(self::$_app)) new APP();
            return self::$_app;
        }
        public static function site($name)
        {
            return self::app()->site->$name;
        }
        public static function path($name)
        {
            return self::app()->path->$name;
        }
        public static function var($name,$value=null)
        {
            if($value===null){
                if(isset(self::app()->data[$name]))return self::app()->data[$name];
                return '';
            }else{
                self::app()->data[$name] = $value;
                return self::app();
            }
        }
        public static function template($file,$dirpath='',$savepath=''){
            if(empty($dirpath)){
                $dirpath = plugin::template_dir()?:self::app()->path->template;
                $cache_file = str_replace(array($dirpath,'/'),array('','_'),$file);
            }else{
                $cache_file = str_replace('/','_',strstr($file,'.',true)).'.php';
            }
            if(empty($savepath)){
                $savepath = self::app()->path->cache.'template/';
            }
            if(defined('DEBUG')&&constant('DEBUG') ||  !is_file($savepath.$cache_file)){
                $template = new template(self::app()->path,self::app()->site);
                $data =  $template->html($file,$dirpath);
                $data = plugin::template_replace($data);
                $cache_dir = dirname($savepath.$cache_file).'/';
                if(!is_dir($cache_dir))mkdir($cache_dir);
                file_put_contents($savepath.$cache_file,$data);
            }
            return $savepath.$cache_file;
        }
        public function register_autoload($class)
        {
            include $this->get_class_file($class);
        }
        public function get_env_data()
        {
            $webroot = str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']);
            $website = ($_SERVER['HTTPS'] == 'off' ? 'http://' : 'https://') . $_SERVER['HTTP_HOST'];
            $approot = str_replace('\\', '/', dirname(__DIR__) . "/");
            $appsite = str_replace($webroot, '', $approot);
            $this->path = (object)array(
                'web' => $webroot,
                'app' => $approot,
                'conf' => $approot . 'assets/#conf/',
                'cache' => $approot . 'assets/cache/',
                'class' => $approot . 'assets/#class/',
                'template' => $approot . 'assets/#template/',
                'routes' => $approot . 'assets/#routes/',
                'plugin' => $approot . 'plugin/',
                'upload' => $approot . 'upload/',
                'css' => $approot . 'assets/css/',
            );
            $this->site = (object)array(
                'web' => $website,
                'url' => $website.$_SERVER['REQUEST_URI'],
                'app' => $appsite,
                'js' => $appsite . 'assets/js/',
                'css' => $appsite . 'assets/css/',
                'images' => $appsite . 'assets/images/',
                'cache' => $appsite . 'assets/cache/',
                'plugin' => $appsite . 'plugin/',
                'upload' => $appsite . 'upload/',
            );
            $this->data += array(
                'time'=>$_SERVER['REQUEST_TIME'],
            );
            $this->get_env_url();
        }
        public function get_env_url()
        {
            $this->data['GET'] = $_GET;
            $get_first = array_key_first($_GET);
            $router_attr = array(
                'app'=>'index',
                'act'=>'',
                'do'=>'',
            );
            if (!empty($get_first)&&empty($_GET[$get_first])) {
                unset($this->data['GET'][$get_first]);
                $router_data = preg_replace(
                    array('/\_\w+$/','/\/\w+\/?$/','/[\-\_]/','/^\//'),
                    array('','','/',''),
                    $get_first
                );
                foreach(explode('/',$router_data) as $k=>$v){
                    if($k==0)$router_attr['app'] = $v;
                    else if($k==1)$router_attr['act'] = $v;
                    else if($k==2)$router_attr['do'] = $v;
                    else $router_attr['val'+($k-2)] = $v;
                }
            }
            $this->router = (object) $router_attr;
        }
        public function get_config_data(){
            if(is_file($this->path->conf.'config.inc.php')){
                $this->conf = (object) include($this->path->conf.'config.inc.php');
                if(!empty($this->conf->version)){
                    self::$version = $this->conf->version;
                }
            }else{
                if($this->router->app !='install'){
                    $this->router = (object)array(
                        'app'=>'install'
                    );
                }
                $this->conf = (object) array();
            }
        }
        public function get_lang()
        {
            if(!empty($this->conf->lang)){
                $this->lang = include($this->path->conf.'lang/'.$this->conf->lang.'.php');
            }
        }
        public function get_class_file($class)
        {
            $arr = explode('\\',$class);
            if($arr[0]=='Nenge'){
                return $this->path->class.$arr[1].'.php';
            }else if(!empty($arr[1])){
                if(is_file($this->path->class.$arr[1].'/'.$arr[1].'.php'))return $this->path->class.$arr[1].'/'.$arr[1].'.php';
                else return $this->path->class.$arr[1].'/src/'.implode('/',array_slice($arr,2)).'.php';
            }
            return $this->path->class.implode('/',$arr).'php';
        }
        public function get_database()
        {
            if(empty($this->db))$this->db = new database(!empty($this->conf->db)?$this->conf->db:array());
            return $this->db;
        }
        public function get_cache_data()
        {
            # code...
        }
        public function get_session_data()
        {
            # code...
        }
    }
}
