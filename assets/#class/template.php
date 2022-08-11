<?php
namespace Nenge;
use Nenge\APP;
use ScssPhp\ScssPhp\Compiler;
class template
{
	public static $scss;
	public $path;
	public $site;
	public $DIR;
	public $basepath;
	public function __construct($path,$site)
	{
		$this->path = $path;
		$this->site = $site;
	}
	public function html($file,$dirpath = '')
	{
		$this->basepath = $dirpath;
		$srcfile = $this->get_abspath($file,$dirpath);
		if($dirpath!==''&&$dirpath!=$this->path->template&&!is_file($srcfile)){
			$srcfile = $this->get_abspath(str_replace($dirpath,'',$file),$this->path->template);
		}
		$this->DIR = str_replace('\\','/',dirname($srcfile) . '/');
		$template = file_get_contents($srcfile);
		if(empty($template)) return '';
		$template = $this->parse_replace($template);
		return $template;
	}
	public function parse_replace($template)
	{

		$template = preg_replace_callback("/[\n\r\t]*\<\!\-\-\{template\s+(.+?)\}\-\-\>[\n\r\t]*/i", array($this, 'parse_callback_template'), $template);
		
		$template = preg_replace("/\<\!\-\-\{hook\s+?(.+?)\}\-\-\>/",'<?=plugin::hook("\\1")?>', $template);

		$template = preg_replace("/[\n\r\t]*\<\!\-\-\{url\s(.*?)(\|([\w\d\$\-\_\[\]\=\&]+))?\}\-\-\>[\n\r\t]*/","<?=app::url(\"\\1\",\"\\3\")?>", $template);

		$template = preg_replace("/\t*\<\!\-\-\{var\s(\w+?)\}\-\-\>\t*/i","<?=\$_G['\\1']?>", $template);

		$template = preg_replace("/\<\!\-\-\{header\s(\w+?)\}\-\-\>/","<?=\$_G['headers']['\\1']?>", $template);

		$template = preg_replace("/[\n\r\t]*\<\!\-\-\{date\s(.+?)\}\-\-\>[\n\r\t]*/","<?=date(DATE_ATOM,\\1)?>", $template);

		$template = preg_replace("/[\n\r\t]*\<\!\-\-\{lang\s+(.+?)\}\-\-\>[\n\r\t]*/",'<?=app::lang(trim("\\1"))?>', $template);

		$template = preg_replace_callback("/\t*href=\"(.+?\.scss)\"/",array($this,'load_scss_link'), $template);
		$template = preg_replace("/\t*\<\!\-\-\{loadcss\s(.+?\.scss)\}\-\-\>\t*/",'<link rel="stylesheet" type="text/css" href="' . template::loadcss("\\1") . '" />', $template);
		
		$template = preg_replace_callback("/\t*\<\!\-\-\{echo\s+(.+?)\}\-\-\>\t*/", array($this, 'parse_callback_stripvtags_echo'), $template);
		$template = preg_replace("/\<\!\-\-\{(\\\$[a-zA-Z0-9_\-\>\[\]\'\"\$\.\x7f-\xff]+)\}\-\-\>/", "<?=\\1?>", $template);

		$template = preg_replace("/\t*\<\!\-\-\{(.+?)\}\-\-\>\t*/s", "{\\1}", $template);


		$template = preg_replace_callback("/\{eval\}\s*(\<\!\-\-)*(.+?)(\-\-\>)*\s*\{\/eval\}/is", array($this, 'parse_callback_evaltags_2'), $template);
		$template = preg_replace_callback("/{eval\s+(.+?)\s*\}/", array($this, 'parse_callback_evaltags_1'), $template);



		$template = preg_replace("#\{([A-Z\_]+)\}#", "<?=\\1?>", $template);



		$template = preg_replace_callback("/([\n\r\t]*)\{if\s+(.+?)\}([\n\r\t]*)/is", array($this, 'parse_callback_stripvtags_if123'), $template);
		$template = preg_replace_callback("/([\n\r\t]*)\{elseif\s+(.+?)\}([\n\r\t]*)/is", array($this, 'parse_callback_stripvtags_elseif123'), $template);
		$template = preg_replace("/\{else\}/i", "<? } else { ?>", $template);
		$template = preg_replace("/\{\/if\}/i", "<? } ?>", $template);
		$template = preg_replace_callback("/\{loop\s+(\S+)\s+(\S+)\}/is", array($this, 'parse_callback_stripvtags_loop12'), $template);
		$template = preg_replace_callback("/\{loop\s+(\S+)\s+(\S+)\s+(\S+)\}/is", array($this, 'parse_callback_stripvtags_loop123'), $template);
		$template = preg_replace("/\{\/loop\}/i", "<? } ?>", $template);

		/*$template = preg_replace("/\{([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\}/s", "<?=\\1?>", $template);*/
		$template = preg_replace("/\<\?(\s{1})/is", "<?php\\1", $template);
		$template = preg_replace("/\<\?\=(.+?)\?\>/is", "<?php echo \\1;?>", $template);
		return $template;
	}
	function parse_callback_template($m)
	{
		if(strpos($m[1],'$')===0){
			$file = $m[1];
		}else{
			$file = str_replace(array('{','}'),array('".','."'),$m[1]);
			$file = '"'.str_replace(array('{','}'),array('".','."'),$file).'"';
		}
		return "<?php include Nenge\APP::template(\"".$this->DIR."\".".$file."));?>";
	}
	public function get_abspath($file, $current)
	{
		if (stripos($file, $this->path->web) !== false) {
			return $file;
		} elseif (substr($file, 0, 1) == '/') {
			$approot = $this->path->template;
			$current_file = $approot.substr($file, 1);
		} else {
			if(empty($current)) $current = $this->path->template;
			$file = preg_replace('/^\.\//', '', $file);
			if (preg_match('/^(\.\.\/)+?/', $file, $matches)) {
				$num = substr_count($matches[1], '../');
				$file = str_replace($matches[1], '', $file);
				if ($num >= 1) {
					$current = dirname($current, $num) . '/';
				}
			}
			$current_file = $current . $file;
		}
		return $current_file;
	}
	public function parse_callback_appstr($str)
	{
		$str = str_replace('"', '\'', $str);
		$str = preg_replace('/\{(\$?[a-zA-Z\-\_\d]+?)\}/', '".$1."', $str);
		return $str;
	}
	public function parse_callback_appvar($matches)
	{
		return "<?php echo \$_G[\"" . $matches[1] . "\"];?>";
	}
	public function parse_callback_appurl($matches)
	{
		$url = $matches[1] ?: $matches;
		$exp = '';
		if (isset($matches[3])) $exp = ",\"" . $this->parse_callback_appstr($matches[3]) . "\"";
		return "<?php echo app::url(\"{$this->parse_callback_appstr($url)}\"{$exp});?>";
	}
	public function parse_callback_appheader($matches)
	{
		$header = $matches[1] ?: $matches;
		return "<?php echo \$_G['headers'][\"{$this->parse_callback_appstr($header)}\"];?>";
	}
	public function parse_callback_appdate($matches)
	{
		$header = $matches[1] ?: $matches;
		return "<?php echo date(DATE_ATOM,".$matches[1].");?>";
	}
	public function parse_callback_stripvtags_loop12($matches)
	{
		return $this->stripvtags('<? if(is_array(' . $matches[1] . ')) foreach(' . $matches[1] . ' as ' . $matches[2] . ') { ?>');
	}

	public function parse_callback_stripvtags_loop123($matches)
	{
		return $this->stripvtags('<? if(is_array(' . $matches[1] . ')) foreach(' . $matches[1] . ' as ' . $matches[2] . ' => ' . $matches[3] . ') { ?>');
	}
	public function parse_callback_stripvtags_if123($matches)
	{
		return $this->stripvtags($matches[1] . '<? if(' . $matches[2] . ') { ?>' . $matches[3]);
	}
	public function parse_callback_stripvtags_elseif123($matches)
	{
		return $this->stripvtags($matches[1] . '<? } elseif(' . $matches[2] . ') { ?>' . $matches[3]);
	}
	function stripvtags($expr, $statement = '')
	{
		$expr = str_replace('\\\"', '\"', preg_replace("/\<\?\=(\\\$.+?)\?\>/s", "\\1", $expr));
		$statement = str_replace('\\\"', '\"', $statement);
		return $expr . $statement;
	}
	public function parse_callback_evaltags_2($m)
	{
		return $this->evaltags($m[1]);
	}
	public function parse_callback_evaltags_1($m)
	{
		return $this->evaltags($m[1]);
	}
	public function evaltags($php)
	{
		return "<?php $php;?>";
	}
	function parse_callback_stripvtags_echo($m)
	{
		return $this->parse_stripvtags('<? echo ' . $m[1] . '; ?>');
	}
	function parse_callback_language($m)
	{
		return '<?=app::lang(trim(\''.$m[1].'\'))?>';
	}
	function parse_stripvtags($expr, $statement = '')
	{
		$expr = str_replace('\\\"', '\"', preg_replace("/\<\?\=(\\\$.+?)\?\>/s", "\\1", $expr));
		$statement = str_replace('\\\"', '\"', $statement);
		return $expr . $statement;
	}
	public function loadcss($matches,$mode=false,$ouput=true)
	{
		$file = is_array($matches)?$matches[1]:$matches;
		$cache_file = 'style/scss_'.str_replace('.scss','',basename($file)).'.css';
		if($ouput){
			if($this->basepath!=$this->path->template){
				$csspath = $this->DIR;
			}else{
				$csspath = $this->path->css;
			}
			$file = $this->get_abspath($file,$csspath);
			if(!is_file($file)) return '';
			if(empty(self::$scss)){
				self::$scss = new Compiler();
				self::$scss->setOutputStyle('compressed');
			}
			self::$scss->setImportPaths(dirname($file).'/');
			self::$scss->addVariables((array)$this->site);
			$cache_scss = file_get_contents($file);
			if(!is_dir(dirname(APP::app()->path->cache.$cache_file).'/'))mkdir(dirname(APP::app()->path->cache.$cache_file).'/');
			file_put_contents(APP::app()->path->cache.$cache_file,self::$scss->compileString($cache_scss)->getCss());
		}
		$link = $this->site->cache.$cache_file.'?'.APP::app()->data['time'];
		if($mode) return $link;
		return '<link rel="stylesheet" type="text/css" href="'.$link.'" />';
	}
	public function load_scss_link($matches)
	{
		$link = $this->loadcss($matches,1);
		return 'href="'.$link.'"';
	}
}
