<?php
/**
 * Plugin Name: Edita Site
 * Description: מציג את האתר החדש של Edita בעמוד הבית. התוכן נמשך מהריפו editadzine-ux/editadesign ב־GitHub. השבתת התוסף מחזירה את עמוד הבית הקודם.
 * Version: 1.12.0
 * Author: Edita
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'EDITA_SITE_REPO_ZIP', 'https://codeload.github.com/editadzine-ux/editadesign/zip/refs/heads/main' );

/**
 * Downloads the latest site from GitHub into this plugin's site/ folder.
 * Returns true or a WP_Error.
 */
function edita_site_deploy() {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	$dir  = plugin_dir_path( __FILE__ );
	$tmp  = download_url( EDITA_SITE_REPO_ZIP, 300 );
	if ( is_wp_error( $tmp ) ) {
		return $tmp;
	}
	$work = $dir . 'incoming-' . time() . '/';
	wp_mkdir_p( $work );
	$zip = new ZipArchive();
	if ( true !== $zip->open( $tmp ) ) {
		@unlink( $tmp );
		return new WP_Error( 'edita_zip', 'Could not open the downloaded archive.' );
	}
	$zip->extractTo( $work );
	$zip->close();
	@unlink( $tmp );
	$roots = glob( $work . '*', GLOB_ONLYDIR );
	if ( empty( $roots ) || ! file_exists( $roots[0] . '/index.html' ) ) {
		edita_site_rmdir( $work );
		return new WP_Error( 'edita_zip', 'The archive does not contain index.html.' );
	}
	$old = $dir . 'site-old/';
	if ( is_dir( $old ) ) {
		edita_site_rmdir( $old );
	}
	if ( is_dir( $dir . 'site' ) ) {
		rename( $dir . 'site', rtrim( $old, '/' ) );
	}
	rename( $roots[0], $dir . 'site' );
	edita_site_rmdir( $work );
	update_option( 'edita_site_deployed_at', current_time( 'mysql' ) );
	return true;
}

function edita_site_rmdir( $path ) {
	if ( ! is_dir( $path ) ) {
		return;
	}
	$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $path, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST );
	foreach ( $it as $f ) {
		$f->isDir() ? rmdir( $f->getPathname() ) : unlink( $f->getPathname() );
	}
	rmdir( $path );
}

define( 'EDITA_SITE_MAILTO', 'editadzine@gmail.com' );

/** Contact form endpoint: POST /wp-json/edita/v1/contact */
add_action( 'rest_api_init', function () {
	register_rest_route( 'edita/v1', '/contact', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => 'edita_site_contact',
	) );
	register_rest_route( 'edita/v1', '/track', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => 'edita_site_track',
	) );
} );

/** Marks that a visitor clicked to continue on WhatsApp. */
function edita_site_track( WP_REST_Request $req ) {
	$p   = $req->get_json_params();
	$p   = is_array( $p ) ? $p : $req->get_body_params();
	$id  = isset( $p['lead'] ) ? preg_replace( '/[^a-z0-9]/', '', strtolower( (string) $p['lead'] ) ) : '';
	$evt = isset( $p['event'] ) ? sanitize_key( $p['event'] ) : '';
	if ( '' === $id || 'wa_click' !== $evt ) {
		return new WP_REST_Response( array( 'ok' => false ), 400 );
	}
	$log   = get_option( 'edita_contact_log', array() );
	$found = false;
	foreach ( $log as &$row ) {
		if ( isset( $row['id'] ) && $row['id'] === $id ) {
			$row['wa'] = current_time( 'mysql' );
			$found     = true;
			break;
		}
	}
	unset( $row );
	if ( ! $found ) {
		array_unshift( $log, array( 'id' => $id, 'time' => current_time( 'mysql' ), 'source' => 'wa', 'name' => '', 'wa' => current_time( 'mysql' ) ) );
	}
	update_option( 'edita_contact_log', array_slice( $log, 0, 500 ), false );
	return new WP_REST_Response( array( 'ok' => true ), 200 );
}

add_filter( 'rest_pre_serve_request', function ( $served, $result, $request ) {
	if ( 0 === strpos( $request->get_route(), '/edita/v1/' ) ) {
		header( 'Access-Control-Allow-Origin: *' );
		header( 'Access-Control-Allow-Methods: POST, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Content-Type' );
	}
	return $served;
}, 10, 3 );

function edita_site_contact( WP_REST_Request $req ) {
	$p     = $req->get_json_params();
	$p     = is_array( $p ) ? $p : $req->get_body_params();
	$name  = sanitize_text_field( isset( $p['name'] ) ? $p['name'] : '' );
	$email = sanitize_email( isset( $p['email'] ) ? $p['email'] : '' );
	$type  = sanitize_text_field( isset( $p['type'] ) ? $p['type'] : '' );
	$msg   = sanitize_textarea_field( isset( $p['msg'] ) ? $p['msg'] : '' );
	$trap  = isset( $p['website'] ) ? trim( (string) $p['website'] ) : '';
	$age   = isset( $p['elapsed'] ) ? (int) $p['elapsed'] : 0;
	$src   = isset( $p['source'] ) && 'chat' === $p['source'] ? 'chat' : 'form';
	$part  = ! empty( $p['partial'] ) && 'chat' === $src;
	$lid   = isset( $p['lead'] ) ? preg_replace( '/[^a-z0-9]/', '', strtolower( (string) $p['lead'] ) ) : '';
	$biz   = sanitize_text_field( isset( $p['biz'] ) ? $p['biz'] : '' );
	$stage = sanitize_text_field( isset( $p['stage'] ) ? $p['stage'] : '' );
	$when  = sanitize_text_field( isset( $p['when'] ) ? $p['when'] : '' );
	$phone = sanitize_text_field( isset( $p['phone'] ) ? $p['phone'] : '' );
	$budg  = sanitize_text_field( isset( $p['budget'] ) ? $p['budget'] : '' );
	$slot  = sanitize_text_field( isset( $p['slot'] ) ? $p['slot'] : '' );
	$qs    = sanitize_textarea_field( isset( $p['questions'] ) ? $p['questions'] : '' );
	if ( '' !== $trap || $age < 3000 ) {
		return new WP_REST_Response( array( 'ok' => true ), 200 );
	}
	if ( ( '' === $name && ! $part ) || ( 'form' === $src && ! is_email( $email ) ) || mb_strlen( $msg ) > 5000 || mb_strlen( $name ) > 120 ) {
		return new WP_REST_Response( array( 'ok' => false, 'error' => 'invalid' ), 400 );
	}
	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key = 'edita_contact_' . md5( $ip );
	$n   = (int) get_transient( $key );
	if ( $n >= 5 ) {
		return new WP_REST_Response( array( 'ok' => false, 'error' => 'rate' ), 429 );
	}
	set_transient( $key, $n + 1, HOUR_IN_SECONDS );
	if ( 'chat' === $src ) {
		$subject = $part ? 'צ׳אט שלא הושלם באתר' . ( $name ? ': ' . $name : '' ) . ( $type ? ' (' . $type . ')' : '' ) : ( ( $phone ? '🔥 ליד חם מהצ׳אט: ' : 'פנייה מהצ׳אט באתר: ' ) . $name . ( $type ? ' (' . $type . ')' : '' ) );
		$tel     = $phone ? preg_replace( '/[^\d+]/', '', $phone ) : '';
		$wa      = $tel ? 'https://wa.me/' . preg_replace( '/^0/', '972', ltrim( $tel, '+' ) ) : '';
		$body    = ( $part ? "המבקר/ת התחיל/ה שיחה בצ׳אט ויצא/ה לפני הסוף. זה מה שהספיק/ה למלא:\n\n" : '' ) . "שם: " . ( $name ? $name : 'לא נמסר' ) . "\n" . ( $phone ? "טלפון: {$phone}\n" : '' ) . ( $biz ? "עסק: {$biz}\n" : '' ) . ( $type ? "מה צריך: {$type}\n" : '' ) . ( $stage ? "איפה עומדים: {$stage}\n" : '' ) . ( $budg ? "מה הכי חשוב להשיג: {$budg}\n" : '' ) . ( $when ? "מתי להתחיל: {$when}\n" : '' ) . ( $slot ? "זמן נוח לשיחה: {$slot}\n" : '' ) . ( $qs ? "\nשאלות שנשאלו בצ׳אט:\n{$qs}\n" : '' ) . ( $wa ? "\nלכתוב לו/לה בוואטסאפ: {$wa}\n" : "\nהפונה בחר/ה להמשיך בוואטסאפ ולא השאיר/ה טלפון.\n" ) . "\n" . home_url( '/' );
		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );
	} else {
		$subject = 'פנייה חדשה מהאתר: ' . $name . ( $type ? ' (' . $type . ')' : '' );
		$body    = "שם: {$name}\nמייל: {$email}\n" . ( $type ? "סוג פרויקט: {$type}\n" : '' ) . "\n" . ( $msg ? $msg : '(בלי הודעה)' ) . "\n\n" . 'נשלח מהטופס ב־' . home_url( '/' );
		$headers = array( 'Content-Type: text/plain; charset=UTF-8', 'Reply-To: ' . $name . ' <' . $email . '>' );
	}
	$sent    = wp_mail( EDITA_SITE_MAILTO, $subject, $body, $headers );
	$log     = get_option( 'edita_contact_log', array() );
	$prev_wa = '';
	foreach ( $log as $r ) {
		if ( $lid && isset( $r['id'] ) && $r['id'] === $lid && ! empty( $r['wa'] ) ) {
			$prev_wa = $r['wa'];
		}
	}
	$log     = array_values( array_filter( $log, function ( $r ) use ( $lid ) { return ! ( $lid && isset( $r['id'] ) && $r['id'] === $lid ); } ) );
	array_unshift( $log, array( 'id' => $lid, 'partial' => $part, 'wa' => $prev_wa, 'time' => current_time( 'mysql' ), 'source' => $src, 'phone' => $phone, 'budget' => $budg, 'slot' => $slot, 'questions' => $qs, 'biz' => $biz, 'stage' => $stage, 'when' => $when, 'name' => $name, 'email' => $email, 'type' => $type, 'msg' => $msg, 'mailed' => (bool) $sent ) );
	update_option( 'edita_contact_log', array_slice( $log, 0, 500 ), false );
	return new WP_REST_Response( array( 'ok' => (bool) $sent ), $sent ? 200 : 500 );
}

/** Admin screen listing every lead from the site. */
add_action( 'admin_menu', function () {
	add_menu_page( 'פניות מהאתר', 'פניות מהאתר', 'manage_options', 'edita-leads', 'edita_site_leads_page', 'dashicons-format-chat', 3 );
} );

function edita_site_leads_page() {
	$log = get_option( 'edita_contact_log', array() );
	$n_all = count( $log );
	$n_wa  = count( array_filter( $log, function ( $r ) { return ! empty( $r['wa'] ); } ) );
	$n_tel = count( array_filter( $log, function ( $r ) { return ! empty( $r['phone'] ); } ) );
	echo '<div class="wrap" dir="rtl"><h1>פניות מהאתר</h1>';
	echo '<p style="font-size:14px">סה״כ ' . (int) $n_all . ' פניות · ' . (int) $n_tel . ' השאירו טלפון · ' . (int) $n_wa . ' לחצו לשלוח בוואטסאפ</p>';
	echo '<table class="widefat striped"><thead><tr><th>מתי</th><th>מקור</th><th>שם</th><th>טלפון / מייל</th><th>מה צריך</th><th>מטרה</th><th>מתי להתחיל</th><th>זמן לשיחה</th><th>וואטסאפ</th><th>הודעה / שאלות</th></tr></thead><tbody>';
	if ( ! $log ) {
		echo '<tr><td colspan="10">עוד אין פניות.</td></tr>';
	}
	foreach ( $log as $r ) {
		$src = isset( $r['source'] ) ? $r['source'] : 'form';
		$lbl = 'form' === $src ? 'טופס' : ( 'wa' === $src ? 'וואטסאפ בלבד' : ( ! empty( $r['partial'] ) ? 'צ׳אט, לא הושלם' : 'צ׳אט' ) );
		$tel = ! empty( $r['phone'] ) ? $r['phone'] : '';
		$wal = $tel ? 'https://wa.me/' . preg_replace( '/^0/', '972', ltrim( preg_replace( '/[^\d+]/', '', $tel ), '+' ) ) : '';
		$contact = $tel ? esc_html( $tel ) . ' · <a href="' . esc_url( $wal ) . '" target="_blank">וואטסאפ</a>' : ( ! empty( $r['email'] ) ? '<a href="mailto:' . esc_attr( $r['email'] ) . '">' . esc_html( $r['email'] ) . '</a>' : '' );
		$wa  = ! empty( $r['wa'] ) ? '<span style="color:#1a7f37;font-weight:600">לחץ/ה</span>' : '<span style="color:#8a8a8a">לא</span>';
		$txt = trim( ( isset( $r['msg'] ) ? $r['msg'] : '' ) . ' ' . ( isset( $r['questions'] ) ? $r['questions'] : '' ) );
		echo '<tr><td>' . esc_html( $r['time'] ) . '</td><td>' . esc_html( $lbl ) . '</td><td>' . esc_html( isset( $r['name'] ) ? $r['name'] : '' ) . '</td><td>' . $contact . '</td><td>' . esc_html( isset( $r['type'] ) ? $r['type'] : '' ) . '</td><td>' . esc_html( isset( $r['budget'] ) ? $r['budget'] : '' ) . '</td><td>' . esc_html( isset( $r['when'] ) ? $r['when'] : '' ) . '</td><td>' . esc_html( isset( $r['slot'] ) ? $r['slot'] : '' ) . '</td><td>' . $wa . '</td><td>' . esc_html( $txt ) . '</td></tr>'; // phpcs:ignore
	}
	echo '</tbody></table></div>';
}

/** Serves the site: live on the front page when enabled, or anywhere with ?edita_preview=1. */
add_action( 'template_redirect', function () {
	if ( is_admin() ) {
		return;
	}
	$preview = isset( $_GET['edita_preview'] ); // phpcs:ignore WordPress.Security.NonceVerification
	$live    = get_option( 'edita_site_live' ) && ( is_front_page() || is_home() );
	if ( ! $preview && ! $live ) {
		return;
	}
	$dir = plugin_dir_path( __FILE__ ) . 'site/';
	$url = plugin_dir_url( __FILE__ ) . 'site/';
	if ( ! file_exists( $dir . 'index.html' ) ) {
		return;
	}
	$html = file_get_contents( $dir . 'index.html' );
	$app  = file_get_contents( $dir . 'js/app.js' );
	$fix  = function ( $s ) use ( $url ) {
		return preg_replace( '#(?<![\w/.-])assets/([0-9a-f]{32}\.[a-z0-9]+)#', $url . 'assets/$1', $s );
	};
	$html = $fix( $html );
	$app  = $fix( $app );
	foreach ( array( 'react.production.min.js', 'react-dom.production.min.js', 'dc-lite.js' ) as $js ) {
		$html = str_replace( 'src="js/' . $js . '"', 'src="' . $url . 'js/' . $js . '"', $html );
	}
	$html = str_replace( 'href="css/site.css', 'href="' . $url . 'css/site.css', $html );
	$html = str_replace( '<script src="js/app.js"></script>', '<script>' . str_replace( '</script', '<\/script', $app ) . '</script>', $html );
	if ( $preview ) {
		$html = str_replace( '<head>', "<head>\n<meta name=\"robots\" content=\"noindex\">", $html );
	}
	status_header( 200 );
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	echo edita_site_extras( $html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit;
}, 0 );

/* Favicon from the WordPress site icon; Analytics and Ally are printed by edita_site_frontend(). */
function edita_site_icons() {
	if ( file_exists( ABSPATH . 'favicon.ico' ) && file_exists( ABSPATH . 'apple-touch-icon.png' ) ) {
		$v = '?v=' . filemtime( ABSPATH . 'favicon.ico' );
		return '<link rel="icon" href="/favicon.ico' . $v . '" sizes="48x48">' . "\n"
			. '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png' . $v . '">' . "\n"
			. '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png' . $v . '">' . "\n"
			. '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png' . $v . '">' . "\n"
			. '<link rel="manifest" href="/site.webmanifest">' . "\n"
			. '<meta name="theme-color" content="#1E1E26">' . "\n";
	}
	if ( ! function_exists( 'has_site_icon' ) || ! has_site_icon() ) {
		return '';
	}
	return '<link rel="icon" href="' . esc_url( get_site_icon_url( 32 ) ) . '" sizes="32x32">' . "\n"
		. '<link rel="icon" href="' . esc_url( get_site_icon_url( 192 ) ) . '" sizes="192x192">' . "\n"
		. '<link rel="apple-touch-icon" href="' . esc_url( get_site_icon_url( 180 ) ) . '">' . "\n"
		. '<meta name="theme-color" content="#1E1E26">' . "\n";
}

/**
 * Site Kit's own "exclude from tracking" decision (e.g. logged-in users).
 * Site Kit normally enforces it with an opt-out script in wp_head, which the custom
 * pages don't print, so here the tag is simply not loaded when tracking is disabled.
 */
function edita_site_ga_disabled( $module ) {
	try {
		$m = new \ReflectionMethod( $module, 'is_tracking_disabled' );
		$m->setAccessible( true );
		return (bool) $m->invoke( $module );
	} catch ( \Throwable $e ) {
		$set = get_option( 'googlesitekit_analytics-4_settings' );
		return is_user_logged_in() && is_array( $set ) && ! empty( $set['trackingDisabled'] ) && in_array( 'loggedinUsers', (array) $set['trackingDisabled'], true );
	}
}

/**
 * Front-end assets for the custom pages, which are printed without wp_head/wp_footer.
 * Runs WordPress's script queue once and prints only what the site needs:
 *  - head: the Google Analytics tag set up by Site Kit (same settings, same exclusions),
 *          behind Google Consent Mode tied to the site's own cookie banner;
 *  - foot: the Ally accessibility widget.
 */
function edita_site_frontend() {
	static $out = null;
	if ( null !== $out ) {
		return $out;
	}
	$out = array( 'head' => '', 'foot' => '' );
	try {
		// Site Kit registers its Analytics tag on template_redirect (priority 10), which the
		// custom routes never reach. Run only Site Kit's Analytics registration here.
		global $wp_filter;
		if ( isset( $wp_filter['template_redirect'] ) ) {
			foreach ( $wp_filter['template_redirect']->callbacks as $cbs ) {
				foreach ( $cbs as $cb ) {
					$fn = $cb['function'];
					if ( is_array( $fn ) && is_object( $fn[0] ) && 0 === strpos( get_class( $fn[0] ), 'Google\\Site_Kit\\Modules\\Analytics_4' ) ) {
						if ( ! edita_site_ga_disabled( $fn[0] ) ) {
							call_user_func( $fn );
						}
					}
				}
			}
		}
		do_action( 'wp_enqueue_scripts' );

		$gtag = class_exists( '\\Google\\Site_Kit\\Core\\Tags\\GTag' ) && defined( '\\Google\\Site_Kit\\Core\\Tags\\GTag::HANDLE' ) ? \Google\Site_Kit\Core\Tags\GTag::HANDLE : 'google_gtagjs';
		if ( wp_script_is( $gtag, 'enqueued' ) ) {
			$consent = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}\n"
				. "(function(){var c='';try{c=localStorage.getItem('edita_cookies')||'';}catch(e){}"
				. "if(!c){try{var m=document.cookie.match(/(?:^|; )edita_ck=([^;]+)/);if(m)c=m[1];}catch(e){}}"
				. "gtag('consent','default',{analytics_storage:c==='all'?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});"
				. "window.addEventListener('edita-consent',function(e){gtag('consent','update',{analytics_storage:e&&e.detail==='all'?'granted':'denied'});});})();";
			ob_start();
			echo "<!-- Edita: Google Analytics via Site Kit, with consent mode -->\n<script>" . $consent . "</script>\n"; // phpcs:ignore
			wp_scripts()->do_items( array( $gtag ) );
			$out['head'] = ob_get_clean();
		}

		if ( defined( 'EA11Y_VERSION' ) && wp_script_is( 'ea11y-widget', 'enqueued' ) ) {
			ob_start();
			wp_styles()->do_items( array( 'ea11y-widget-fonts' ) );
			wp_scripts()->do_items( array( 'ea11y-widget' ) );
			$out['foot'] = ob_get_clean();
		}
	} catch ( \Throwable $e ) {
		if ( ob_get_level() ) {
			ob_end_clean();
		}
	}
	return $out;
}

function edita_site_extras( $html ) {
	$fe   = edita_site_frontend();
	$html = preg_replace( '#<link rel="icon"[^>]*>\s*#', '', $html );
	if ( false === strpos( $html, 'googletagmanager.com/gtag/js' ) ) {
		$html = str_replace( '</head>', edita_site_icons() . $fe['head'] . '</head>', $html );
	} else {
		$html = str_replace( '</head>', edita_site_icons() . '</head>', $html );
	}
	if ( $fe['foot'] ) {
		$pos = strrpos( $html, '</body>' );
		if ( false !== $pos ) {
			$html = substr( $html, 0, $pos ) . $fe['foot'] . substr( $html, $pos );
		}
	}
	return $html;
}

/*
 * Indexing: only the home page may appear in search engines.
 * Every other URL (old pages, posts, archives, attachments) gets noindex
 * and is left out of the Yoast sitemap.
 */
function edita_site_is_home_request() {
	return is_front_page() || is_home();
}

add_filter( 'wp_robots', function ( $robots ) {
	if ( ! edita_site_is_home_request() ) {
		$robots['noindex']  = true;
		$robots['follow']   = true;
		unset( $robots['index'], $robots['max-image-preview'] );
	}
	return $robots;
}, 99 );

add_filter( 'wpseo_robots', function ( $value ) {
	return edita_site_is_home_request() ? $value : 'noindex, follow';
}, 99 );

add_action( 'send_headers', function () {
	if ( ! is_admin() && ! edita_site_is_home_request() ) {
		header( 'X-Robots-Tag: noindex, follow', true );
	}
} );

add_filter( 'wpseo_sitemap_entry', function ( $url ) {
	$loc = is_array( $url ) && isset( $url['loc'] ) ? untrailingslashit( $url['loc'] ) : '';
	return ( untrailingslashit( home_url( '/' ) ) === $loc ) ? $url : false;
}, 99 );

/* GEO: a plain-text summary for AI assistants at /llms.txt. */
add_action( 'parse_request', function () {
	$path = isset( $_SERVER['REQUEST_URI'] ) ? strtok( wp_unslash( $_SERVER['REQUEST_URI'] ), '?' ) : ''; // phpcs:ignore
	if ( '/llms.txt' !== $path ) {
		return;
	}
	$file = plugin_dir_path( __FILE__ ) . 'site/llms.txt';
	if ( ! file_exists( $file ) ) {
		return;
	}
	status_header( 200 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	header( 'X-Robots-Tag: noindex' );
	readfile( $file ); // phpcs:ignore
	exit;
}, 0 );

/* Point crawlers at the AI summary too. */
add_filter( 'robots_txt', function ( $out ) {
	return rtrim( $out ) . "\n\n# AI summary: " . home_url( '/llms.txt' ) . "\n";
}, 99 );

/* Content pages (guides and tools) built with the site, plus their sitemap. */
function edita_site_pages() {
	$f = plugin_dir_path( __FILE__ ) . 'site/pages/index.json';
	$list = file_exists( $f ) ? json_decode( file_get_contents( $f ), true ) : array(); // phpcs:ignore
	return is_array( $list ) ? $list : array();
}

add_action( 'parse_request', function () {
	$path = isset( $_SERVER['REQUEST_URI'] ) ? strtok( wp_unslash( $_SERVER['REQUEST_URI'] ), '?' ) : ''; // phpcs:ignore
	$dir  = plugin_dir_path( __FILE__ ) . 'site/pages/';
	if ( '/edita-sitemap.xml' === $path && file_exists( $dir . 'sitemap.xml' ) ) {
		status_header( 200 );
		header( 'Content-Type: application/xml; charset=utf-8' );
		readfile( $dir . 'sitemap.xml' ); // phpcs:ignore
		exit;
	}
	$slug = trim( $path, '/' );
	if ( '' === $slug || ! in_array( $slug, edita_site_pages(), true ) ) {
		return;
	}
	if ( '/' !== substr( $path, -1 ) ) {
		wp_safe_redirect( home_url( '/' . $slug . '/' ), 301 );
		exit;
	}
	status_header( 200 );
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	echo edita_site_extras( file_get_contents( $dir . $slug . '.html' ) ); // phpcs:ignore
	exit;
}, 1 );

add_filter( 'wpseo_sitemap_index', function ( $xml ) {
	return $xml . '<sitemap><loc>' . esc_url( home_url( '/edita-sitemap.xml' ) ) . '</loc></sitemap>' . "\n";
} );

add_filter( 'robots_txt', function ( $out ) {
	return rtrim( $out ) . "\nSitemap: " . home_url( '/edita-sitemap.xml' ) . "\n";
}, 100 );
