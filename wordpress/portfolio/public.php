<?php
defined( 'ABSPATH' ) || exit;

function edita_project_payload( $projects ) {
	return '<script type="application/json" id="edita-projects-data">' . wp_json_encode( $projects, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ) . '</script>';
}
function edita_project_section( $html, $key, $content ) {
	$open = '<!--edita-' . $key . '-->';
	$close = '<!--/edita-' . $key . '-->';
	$start = strpos( $html, $open );
	$end = strpos( $html, $close );
	if ( false === $start || false === $end ) { return $html; }
	return substr_replace( $html, $content, $start, $end + strlen( $close ) - $start );
}
function edita_portfolio_home( $html ) {
	$projects = edita_public_projects();
	$accents = array( '#E8A82A', '#F06A7C', '#9DBFD6' );
	$ixItems = $ixImgs = $logoLoop = array();
	$lensCls = '';
	foreach ( $projects as $i => $p ) {
		$facts = array_column( $p['facts'], 'v', 'k' );
		$ixItems[] = array_merge( $p, array(
			'href'=>edita_project_href( $p['slug'] ), 'cls'=>'ix-row', 'accent'=>$accents[ $i % 3 ],
			'stackTop'=>84 + 14 * $i, 'tagLine'=>$p['kind'] ?: implode( ' · ', array_slice( $p['tags'], 0, 2 ) ),
			'year'=>$facts['שנה'] ?? '',
		) );
		$ixImgs[] = array( 'cls'=>0 === $i ? 'on' : '', 'img'=>$p['img'] );
	}
	foreach ( array( false, true ) as $duplicate ) {
		foreach ( $projects as $p ) {
			$logoLoop[] = array_merge( $p, array( 'href'=>edita_project_href( $p['slug'] ), 'label'=>'לסיפור של ' . $p['name'],
				'dup'=>$duplicate ? 'true' : 'false', 'tab'=>$duplicate ? -1 : 0 ) );
		}
	}
	ob_start();
	include __DIR__ . '/index-view.php';
	$html = edita_project_section( $html, 'index', ob_get_clean() );
	ob_start();
	include __DIR__ . '/logos-view.php';
	$html = edita_project_section( $html, 'logos', ob_get_clean() );
	return str_replace( '</head>', edita_project_payload( $projects ) . '</head>', $html );
}
function edita_project_document( $projects, $index ) {
	$cs = $projects[ $index ];
	$next = $projects[ ( $index + 1 ) % count( $projects ) ];
	$csTotal = (string) count( $projects );
	$workHref = home_url( '/#work' );
	$contactHref = home_url( '/#contact' );
	$domain = preg_replace( '~^https?://(?:www\.)?|/$~i', '', $cs['live'] );
	$cs = array_merge( $cs, array(
		'domain'=>$domain, 'hasLive'=>(bool) $cs['live'], 'noLive'=>! $cs['live'],
		'status'=>$cs['live'] ? 'באוויר, ' . $domain : 'מיתוג ושפה ויזואלית',
		'stmt1'=>$cs['hook'] ?: $cs['challenge'], 'hasBody1'=>(bool) $cs['hook'], 'body1'=>$cs['hook'] ? ( $cs['body1'] ?: $cs['challenge'] ) : '',
		'stmt2'=>$cs['solution'], 'hasBody2'=>(bool) $cs['body2'],
		'scr'=>$cs['full'] ?: ( $cs['demo'] ?: ( $cs['shot'] ?: $cs['img'] ) ),
		'scrCls'=>$cs['full'] ? 'scr-full' : '', 'hintCls'=>$cs['full'] ? '' : 'is-off',
		'shotCap'=>$cs['full'] ? 'עמוד הבית המלא, כפי שהוא באוויר היום' : ( $cs['demo'] ? 'עמוד הבית, כפי שהוא באוויר היום' : ( $cs['shot'] ? 'מתוך האתר החי' : $cs['client'] ) ),
		'liveLine'=>$cs['result'] ?: 'הדרך הכי טובה להבין פרויקט היא לחוות אותו. היכנסו, גללו, ותרגישו את המותג בעצמכם.',
		'nextHref'=>edita_project_href( $next['slug'] ), 'nextName'=>$next['name'], 'nextClient'=>$next['client'], 'nextImg'=>$next['img'],
	) );
	$title = implode( ' | ', array_filter( array( $cs['name'], $cs['kind'], 'Edita Design' ), 'strlen' ) );
	$description = $cs['hook'] ?: ( $cs['body1'] ?: $cs['client'] );
	$canonical = edita_project_href( $cs['slug'] );
	$url = edita_project_site_assets();
	$dir = dirname( EDITA_SITE_MAIN_FILE ) . '/site/';
	ob_start();
	include __DIR__ . '/document.php';
	return ob_get_clean();
}
function edita_portfolio_sitemap( $xml, $projects ) {
	$xml = preg_replace( '~<url>\s*<loc>[^<]*/projects/[^<]+</loc>.*?</url>\s*~s', '', $xml );
	$rows = '';
	foreach ( $projects as $p ) { $rows .= '<url><loc>' . esc_url( edita_project_href( $p['slug'] ) ) . "</loc></url>\n"; }
	return str_replace( '</urlset>', $rows . '</urlset>', $xml );
}
add_action( 'parse_request', function ( $wp ) {
	if ( ! edita_portfolio_ready() ) { return; }
	$path = trim( $wp->request, '/' );
	if ( 'edita-sitemap.xml' === $path ) {
		$xml = file_get_contents( dirname( EDITA_SITE_MAIN_FILE ) . '/site/pages/sitemap.xml' );
		status_header( 200 ); nocache_headers();
		header( 'Content-Type: application/xml; charset=utf-8' );
		echo edita_portfolio_sitemap( $xml, edita_public_projects() );
		exit;
	}
	if ( ! preg_match( '~^projects/([^/]+)$~D', $path, $match ) ) { return; }
	$slug = sanitize_title( rawurldecode( $match[1] ) );
	$projects = edita_public_projects();
	$index = array_search( $slug, array_column( $projects, 'slug' ), true );
	if ( false === $index ) {
		$wp->query_vars = array( 'error'=>'404' );
		remove_action( 'template_redirect', 'redirect_canonical' );
		return;
	}
	$canonical = edita_project_href( $slug );
	if ( rawurldecode( wp_parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ) ) !== rawurldecode( wp_parse_url( $canonical, PHP_URL_PATH ) ) ) {
		wp_safe_redirect( $canonical, 301 ); exit;
	}
	status_header( 200 ); nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	echo edita_site_extras( edita_project_document( $projects, $index ) );
	exit;
}, 0 );
