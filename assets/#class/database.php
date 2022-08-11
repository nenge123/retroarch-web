<?php
namespace Nenge;
use PDO;
use mysqli;
use Exception;
class database{
    public static $_;
    public $config;
    public $driver;
	public $db_link;
	public $sqls = array();
	public $tablelist=array();
    public function __construct($conf=array())
    {
		if(!empty($conf)){
			$this->set_config($conf[1]);
			if(!empty($conf['map']))$this->map_set($conf);
		}
        self::$_ = $this;
    }
    public static function __()
    {
        return self::$_;
    }
	public function set_config($conf)
	{
		$this->config = $conf;
	}
	public function map_set($conf)
	{
		foreach($conf['map'] as $k=>$v){
			if(is_numeric($k)){
				$arr = is_string($v) ? explode(",",$v):$v;
				foreach($arr as $k=>$j){
					$this->tablelist[$j] = !empty($conf[$k])?$conf[$k]:$conf[1];
					$this->tablelist[$k]['id']= !empty($conf[$k])?$k:1;
					$this->tablelist[$j]['table_name'] = $this->tablelist[$j]['pre'].$j;
				}
			}else{
				$this->tablelist[$k] = !empty($conf[$v])?$conf[$v]:$conf[1];
				$this->tablelist[$k]['id']= !empty($conf[$v])?$v:1;
				$this->tablelist[$k]['table_name'] = $this->tablelist[$v]['pre'].$k;
			}
		}
	}
	public function map_get($table)
	{
		if(empty($this->tablelist[$table])){
			$this->tablelist[$table] = $this->config;
			$this->tablelist[$table]['table_name'] = $this->config['pre'].$table;
			$this->tablelist[$table]['id'] = 1;
		}
		return $this->tablelist[$table];
	}
    public function connect($table='')
    {
		$_conf = $this->map_get($table);
		if($_conf['id']==1&&!empty($this->db_link[$_conf['id']])){
			return $this->db_link[$_conf['id']];
		}
        if(class_exists('PDO')){
            $dbname = isset($_conf['name']) ? 'dbname='.$_conf['name'].';':'';
            $attr = array(
                PDO::ATTR_TIMEOUT => 1,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            );
			$link = new PDO('mysql:host='.$_conf['host'].';port='.$_conf['port'].';'.$dbname.'charset='.$_conf['charset'],$_conf['user'], $_conf['pw'], $attr);
            if(!empty($link))$link->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
            $this->driver = 'PDO';

        }else
		if(class_exists('mysqli')){
            $dbname = isset($_conf['name']) ?  $_conf['name']:'';
            $link = new mysqli($_conf['host'],$_conf['user'],$_conf['pw'], $dbname,$_conf['port']);
            if(!empty($link))$link->set_charset($_conf['charset']);
            $this->driver = 'mysqli';
        }else{
            throw new Exception('you must open the pdo_mysql.dll/mysqli.dll');
        }
		$this->db_link[$this->tablelist[$table]['id']] = $link;
        return $link;
    }
	public function db_prepare(Array $arr)
	{
		$link = $this->connect($arr['table']);
		if(empty($arr['method']))$arr['method'] = 'SELECT';
		$arr['method'] = strtoupper($arr['method']);
		if($arr['method']=='INSERT')$arr['method'] = 'INSERT INTO';
		$sql = $arr['method'].' ';
		$tablename = '';
		//SELECT/INSERT INTO/UPDATE/REPLACE INTO/INSERT IGNORE INTO/INSERT DELAYED INTO
		//REPLACE INTO
		//ON DUPLICATE KEY UPDATE
		//DELETE FROM
		//SHOW
		//contents=values(contents),title=values(title);
		if(!empty($arr['table']))$tablename = ' `'.$this->table($arr['table']).'` ';
		$where = '';
		if(in_array($arr['method'],array('SELECT','UPDATE','DELETE'))){
			$blind = array();
			if($arr['method'] == 'DELETE'){
				$sql .= ' FROM '.$tablename;
			}else if($arr['method'] == 'SELECT'){
				$isjoin = !empty($arr['join'])&&is_array($arr['join']);
				if(!empty($arr['order'])&&is_array($arr['order'])){
					if(!empty($arr['order'][0])){
						$orderid = preg_replace('/\s/','',$arr['order'][0]);
						$where .= ' ORDER BY `'.$orderid.'` '.(!isset($arr['order'][1])&&strtoupper($arr['order'][1])=='ASC' ? 'ASC':'DESC');
					}else{
						$orderdata = '';
						foreach($arr['order'] as $orderkey=>$order){
							$orderkey2 = preg_replace('/\s/','',$orderkey);
							if(!empty($orderkey2)){
								$orderdata .='`'.$orderkey2.'` '.($order&&strtoupper($order)=='ASC'?'ASC':'DESC').',';
							}
						}
						$where .= ' ORDER BY '.substr($orderdata,0,-1);
					}
				}
				if(!empty($arr['limit'])&&is_array($arr['limit'])){
					$arr['limit'] = array_map(fn($v)=>intval($v),$arr['limit']);
					$where .= ' LIMIT '.implode(',',$arr['limit']);
				}
				if(isset($arr['select'])&&$arr['select']!=='*'&&!empty($arr['select'])){;
					if(is_string($arr['select'])&&stripos($arr['select'],'COUNT(')!==false || is_array($arr['select'])&&stripos($arr['select'][0],'COUNT(')!==false){
						$selecttxt = is_array($arr['select']) ? $arr['select'][0]:$arr['select'];
						$arr['selectext'] = 'COUNT('.($isjoin?'`varA`.':'').substr($selecttxt,6);
						$arr['FetchMode'] = 'NUM';
						$arr['countmode'] = true;
						$arr['mode'] = 'fetch';
					}else{
						$arr['selectext'] = $this->db_prepare_select($arr['select'],$isjoin?'`varA`.':'');
					}
				}else{
					$arr['selectext'] = $isjoin?'`varA`.*':' * ';
				}
				$_sql =' FROM '. $tablename;
				if($isjoin){
					$_sql.=' as varA ';
					foreach($arr['join'] as $k=>$v){
						if(!empty($v['key'])&&(!empty($v['table']) || !empty($arr['tabletxt']))){
							$v['type'] = empty($v['type'])?'left':$v['type'];
							$_sql.= $v['type'].' join ';
							if(!empty($v['table'])){
								$_sql.=' `'.$this->table($v['table']).'` ';
							}elseif(!empty($arr['tabletxt'])){
								$_sql.=$arr['tabletxt'];
							}
							$_sql .= ' as varB'.$k.' ';
							if(is_string($v['key'])){
								$_sql .= ' on `varB'.$k.'`.`'.$v['key'].'`=`varA`.`'.$v['key'].'` ';
							}else{
								$mkey = [];
								foreach($v['key'] as $m){
									$mkey = ' on `varB'.$k.'`.'.$m.'=`varA`.'.$m.' ';
								}
								$_sql .= implode(' AND ',$mkey);
							}
							if(empty($arr['countmode'])){
								if(!empty($v['select'])){
									$newselect = $this->db_prepare_select($v['select'],'`varB'.$k.'`.');
									if(!empty($newselect)){
										$arr['selectext'].=','. $newselect;			
									}
									$newselect = '';
								}else{
									$arr['selectext'].=',`varB'.$k.'`.*';
								}
							}
						}
					}
				}
				$sql .= $arr['selectext'].$_sql;
			}else if(isset($arr['data'])){
				$setvar = [];
				$sql .= $tablename;
				foreach($arr['data'] as $k=>$v){
					$spt = strstr($k,':',true);
					$key = $k;
					if($spt){
						$key = substr($k,strlen($spt)+1);
						if($spt == 'file'){
							$setvar[] = '`'.$k.'`=values(load_file(:'.$k.')';
						}else{
							if($spt == '+')$spt = '=`'.$key.'` + ';
							if($spt == '-')$spt = '=`'.$key.'` - ';
							$setvar[] = '`'.$key.'` '.$spt.' :'.$key.' ';
						}
						
					}else{
						$setvar[] = '`'.$key.'`= :'.$key.' ';
					}
					$blind[':'.$key] = is_array($v) ? serialize($v):$v;
				}
				$sql .= "\nSET ".implode(",\n",$setvar);
			}else{
				return array();
			}
			if(!empty($arr['wdata'])&&empty($arr['where'])){
				$arr =array_merge($arr,self::filter_fetch_where($arr['wdata'],$arr));
			}
			if(!empty($arr['where'])){
				$where .= ' WHERE ';
				if(is_string($arr['where'])){
					if(!empty($arr['wdata'])&&is_array($arr['wdata'])){
						foreach($arr['wdata'] as $k=>$v){
							if(!is_array($v)&&stripos($k,':var_')!==false&&stripos($arr['where'],$k)!==false){
								$blind[$k] = $v;
							}elseif(stripos($arr['where'],':'.$k)!==false){
								if(is_array($v)){
									if(preg_match("/[\'\"\`]?{$k}[\'\"\`]?\s*?(in|not\sin|\=|\!\=)\s*?:{$k}/i",$arr['where'],$mathches)){
										list($arr['where'],$blind) = $this->db_prepare_where($arr['where'],in_array($mathches[1],array('=','in'))?1:0,$k,$v,$blind);
									}
								}else{
									$arr['where'] = str_replace(":$k"," :var_$k ",$arr['where']);
									$blind[':var_'.$k]  = $v;
								}
							}
						}
					}
					$where .= ' '.$arr['where'].' ';
				}
			}
			$where .=' ;'; 
			$sql .=$where;
			$t = microtime(1);
            if($this->driver=='mysqli'){
                $blinds = '';
                $blind = $this->db_prepare_mysqli_blind($sql,$blind);
                foreach($blind  as $k=>$v){
                    if(is_integer($v)){
                        $blinds .='i';
                        $blind[$k] = (int) $v;
                    }else{
                        $blinds .='s';
                    }
                }
                $sth = $link->prepare($sql);
                if(!empty($blind)){
                    $sth->bind_param($blinds,...$blind);
                }
                $sth->execute();
            }else{
                $sth = $link->prepare($sql);
                if (empty($blind))$sth->execute();
                else $sth->execute($blind);
            }
			if($arr['method'] == 'SELECT'){
                if($this->driver=='PDO'){
                    if(!empty($arr['FetchMode'])&&$arr['FetchMode']=='NUM'){
						$sth->setFetchMode(PDO::FETCH_NUM);
                    }
                    if(!empty($arr['mode'])&&$arr['mode']=='fetch'){
                        $result = $sth->fetch();
                    }else{
                        $result = $sth->fetchAll();
                        if(isset($arr['PRIMARY'])&&!empty($arr['PRIMARY'])){
                            $newresult = [];
                            foreach($result as $v){
                                if(isset($v[$arr['PRIMARY']])){
                                    $newresult[$v[$arr['PRIMARY']]] = $v;
                                }
                            }
                            if(!empty($newresult)){
                                $result = $newresult;
                            }
                        }
                    }
                }else{
                    $result_data = $sth->get_result();
                    if(!empty($arr['mode'])&&$arr['mode']=='fetch'){
                        $result = call_user_func(array($result_data,$arr['FetchMode']?'fetch_row':'fetch_assoc'));
                    }else{
                        for ($result = array (); $row = call_user_func(array($result_data,$arr['FetchMode']?'fetch_row':'fetch_assoc'));){
                            if(isset($arr['PRIMARY'])&&!empty($arr['PRIMARY'])&&isset($row[$arr['PRIMARY']])){
                                $result[$row[$arr['PRIMARY']]] = $row;
                            }else{
                                $result[] = $row;
                            }
                        }

                    }
                }
                $this->db_prepare_close($sth);
				$this->db_sql_query_list($sql,$t);
				return empty($result)?array():$result;
			}else{
				$result = !empty($sth->affected_rows)?$sth->affected_rows:$sth->rowCount();
				$this->db_prepare_close($sth);
				$this->db_sql_query_list($sql,$t);
				return $result>0 ? array('line'=>$result):array();
			}
		}else {
			$sql .= $tablename;
			if(isset($arr['mdata'])){
				list($sqlname,$temp,$update) = $this->db_prepare_keys($arr['mdata'][0]);
                if($this->driver=='mysqli')$temp = preg_replace('/\:[^\s]+/','?',$temp);
				$msql = $sql.$sqlname."\nVALUES".$temp;
				if(isset($arr['update'])){
					$msql .= "\nON DUPLICATE KEY UPDATE \n".$update;
				}
				$msql .= ';';
				$result = 0;
				$lastid = [];
				foreach($arr['mdata'] as $k=>$v){
					$t = microtime(1);
					$sth = $link->prepare($msql);
                    if($this->driver=='mysqli'){
                        if(!empty($v)){
                            $vs = '';
                            $vp = array();
                            foreach($v  as $vk=>$vv){
                                if(is_integer($vv)){
                                    $vs .='i';
                                    $vp[] = (int) $vv;
                                }else{
                                    $vs .='s';
                                    $vp[] = $vv;
                                }
                            }
                            $sth->bind_param($vs,...$vp);
                        }
                        $sth->execute();
                        $result +=  $sth->affected_rows;
                        $lastid[] =  $sth->insert_id;
                    }else{
                        if (empty($v))$sth->execute();
                        else $sth->execute($v);
                        $result += $sth->rowCount();
                        $lastid[] = $link->lastInsertId();
                    }
					$this->db_prepare_close($sth);
					$this->db_sql_query_list($msql,$t);
				}
				return $result>0||!empty($lastid) ? array('lastid'=>$lastid,'line'=>$result) :array();
			}else if(isset($arr['data'])){
				list($sqlname,$temp,$update) = $this->db_prepare_keys($arr['data']);
                if($this->driver=='mysqli')$temp = preg_replace('/\:[^\s]+/','?',$temp);
				$msql = $sql.$sqlname."\nVALUES".$temp;
				$sqldata = array();
				foreach($arr['data'] as $k=>$v){
					$sqldata[':'.$k] = $v;
				}
				if(isset($arr['update'])&&$arr['update']==true){
					$msql .= "\nON DUPLICATE KEY UPDATE \n".$update;
				}
				$msql .= ';';
				$t = microtime(1);
				$sth = $link->prepare($msql);
                if(empty($sth)) return array();
                if($this->driver=='mysqli'){
                    if(!empty($sqldata)){
                        $sqldata2s = '';
                        $sqldata2 = array();
                        foreach($sqldata  as $k=>$v){
                            if(is_integer($v)){
                                $sqldata2s .='i';
                                $sqldata2[] = (int) $v;
                            }else{
                                $sqldata2s .='s';
                                $sqldata2[] = $v;
                            }
                        }
                        $sth->bind_param($sqldata2s,...$sqldata2);
                    }
                    $sth->execute();
                }else{
                    if (empty($sqldata))$sth->execute();
                    else $sth->execute($sqldata);
                }
				//影响行数 line rowCount
                if($this->driver=='mysqli'){
                    if($sth->error){
                        throw new Exception($sth->error);
                    }
                    $result =  $sth->affected_rows;
                    $lastid =  $sth->insert_id;
                }else{
                    $result = $sth->rowCount();
                    $lastid = $link->lastInsertId();

                }
				$this->db_prepare_close($sth);
				$this->db_sql_query_list($msql,$t);
				return $result>0||!empty($lastid) ? array('lastid'=>$lastid,'line'=>$result) :array();
			}
		}
	}
	public function db_sql_query_list($sql,$t)
	{
		if(count($this->sqls) < 1000) $this->sqls[] = substr(microtime(1)-$t, 0, 6).' '.$sql;
	}
	public function db_prepare_select($select,$join)
	{	
		if(is_string($select)){
			$select = array_map(fn($str)=>trim($str),explode(',',$select));
		}
		return $join.implode(','.$join,$this->db_prepare_quote($select));
	}
	public function db_prepare_where($where,$p,$k,$v,$blind)
	{
		//$newsql = '(';
		//$spt = $p ? '=' :'!=';
		//$endspt = $p  ? ' or ':' AND ';
		$newsql = [];
		foreach($v as $i=>$j){
			//$newsql .= '`'.$k .'` '.$spt.' :var_'.$k.$i.$endspt;
			$newsql[] = ' :var_'.$k.$i.' ';
			$blind[':var_'.$k.$i] =  $j;
		}
		//$newsql = substr($newsql, 0, strlen($endspt)*-1);
		//$newsql .= ')';
		//$where = preg_replace("/[\'\"\`]?{$k}[\'\"\`]?\s*?[\w\=\!]+?\s*?:{$k}/",$newsql,$where);
		$spt = $p ? ' IN ' :' NOT IN ';
		$newsql = ' '.$k.$spt.'('.implode(',',$newsql).') ';
		$where = preg_replace("/[\'\"\`]?{$k}[\'\"\`]?\s*?[\w\=\!]+?\s*?:{$k}/",$newsql,$where);
		return [$where,$blind];
	}
	public function db_prepare_quote($arr,$k=false)
	{
		return array_map(fn($str)=>$k?' :'.$str.' ':' `'.$str.'` ',$arr);
	}
	public function db_prepare_keys($arr)
	{
		$arr = array_keys($arr);
		//$k."=values($k)";
		return array(
			0=>'('.implode(',',$this->db_prepare_quote($arr)).')',
			1=>'('.implode(',',$this->db_prepare_quote($arr,true)).')',
			2=>implode(",\n",array_map(fn($str)=>$str.'=values('.$str.')',$arr))
		);
	}
	public static function filter_fetch_where($where,$query=array())
	{
		$where_str = '';
		$result = array('condition'=>false);
		if(!empty($query['condition']))$result['condition'] = true;
		$cstr = $result['condition']==true ? ' OR ':' AND ';
		$where_arr = array();
		if(!empty($where)){
			if(is_array($where)){
				foreach($where as $k=>$v){
					$spt = strstr($k, ':',true);
					if($spt!==false){
						$key = substr($k,strlen($spt)+1); 
						$where_str .= ' `'.$key.'` '.$spt.' :'.$key.$cstr.' ';
						$where_arr[$key] = $v;
					}else{
						$where_str .= ' `'.$k.'` = :'.$k.$cstr.' ';
						$where_arr[$k] = $v;
					}
				}
				$result['where'] = substr($where_str, 0, strlen($cstr)*-1);
				$result['wdata'] = $where_arr;
			}elseif(is_string($where)&&!empty($query['wdata'])){
				$result['where'] = $where;
			}
		}
		return $result;
	}
	public function table($table){
		return $this->map_get($table)['table_name'];
	}
	public static function update($table,$arr,$where,$condition=false,$query=array())
	{
		return self::insert($table,$arr,$where,false,'update',$condition,$query);
	}
	public static function insert($table,$arr,$where='',$update=false,$method='insert',$condition=false,$query=array()){
		$query['method']=$method;
		$query['table']=$table;
		if($condition==true)$query['condition'] = true;
		if(!empty($arr[0])){
			$query['mdata'] = $arr;
		}else{
			$query['data'] = $arr;
		}
		if(!empty($where)){
			if(is_array($where)){
				if(!empty($query['where']))unset($query['where']);
				$query['wdata'] = $where;
			}elseif(!empty($query['wdata'])){
				$query['where'] = $where;
			}
		}
		$query['update'] = $update;
		return self::prepare($query);
	}
	public static function delete($table,$where='',$query=array()){
		return self::fetch($table,$where,$query,'','DELETE');
	}
	public static function fetchAll($table,$where='',$query=array()){
		return self::fetch($table,$where,$query,'fetchAll');
	}
	public static function fetch(String $table,$where='',Array $query=array(),String $mode='fetch',String $method='SELECT'){
		$query['method'] = $method;
		$query['table'] = $table;
		$query['mode'] = $mode;
		if(!empty($where)){
			if(is_array($where)){
				if(!empty($query['where']))unset($query['where']);
				$query['wdata'] = $where;
			}elseif(!empty($query['wdata'])){
				$query['where'] = $where;
			}
		}
		if(empty($mode)){
			$query['mode']='fetch';
		}
		if($query['mode']=='fetch'){
			$query['limit'] = array(1);
		}
		return self::prepare($query);
	}
	public static function fetch_count($table,$select='',$where='',$condition=false)
	{
		$query = array(
			'method'=>'SELECT',
			'table'=>$table,
			'select'=>'COUNT('.(empty($select) || $select=='*'?'*':'`'.$select.'`').')',
			'condition'=>$condition
		);
		if(!empty($where)){
			if(is_array($where)){
				if(!empty($query['where']))unset($query['where']);
				$query['wdata'] = $where;
			}elseif(!empty($query['wdata'])){
				$query['where'] = $where;
			}
		}
		$result = self::prepare($query);
		if(empty($result) || empty($result[0])){
			$result = 0;
		}else{
			$result = $result[0];
		}
		return $result;
	}
	public static function prepare(Array $arr)
	{
		return self::__()->db_prepare($arr);
	}
    public function db_prepare_close($sth)
    {
        method_exists($sth,'closeCursor')?$sth->closeCursor():$sth->close();
    }
    public function db_prepare_mysqli_blind(&$sql,$blind)
    {
        $this->newblind = array();
        if(!empty($blind)){
            $this->tmpblind = $blind;
            $blind = $blind||array();
            $sql = preg_replace_callback('/(\:[^\s]+)/',array($this,'db_prepare_mysqli_blind_callback'),$sql);
        }
        return $this->newblind;
    }
    public function db_prepare_mysqli_blind_callback($result)
    {
        $this->newblind[] = $this->tmpblind[$result[0]];
        return ' ? ';
    }
	public function db_check_name($name)
	{
		$link = $this->connect();
		$result = $link->query('show databases LIKE \'%'.$name.'%\';');
		if($this->driver=='mysqli'){
			$result = $result->fetch_all(MYSQLI_NUM);
		}else{
			$result = $result->fetchAll(PDO::FETCH_NUM);
		}
		foreach($result as $k=>$v){
			if($v[0]==$name){
				return true;
				break;
			}
		}
		return false;
	}
	public function db_create_name($name)
	{
		$link = $this->connect();
		try{
			$result = $link->query('CREATE DATABASE IF NOT EXISTS '.$name.';');
			return true;
		}catch(Exception $e){
			return false;
		}
	}
}