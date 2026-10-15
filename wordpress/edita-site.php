<?php
/**
 * Plugin Name: Edita Site
 * Description: מציג את האתר החדש של Edita בעמוד הבית. התוכן נמשך מהריפו editadzine-ux/editadesign ב־GitHub. השבתת התוסף מחזירה את עמוד הבית הקודם.
 * Version: 1.2.0
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
} );

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
	if ( '' !== $trap || $age < 3000 ) {
		return new WP_REST_Response( array( 'ok' => true ), 200 );
	}
	if ( '' === $name || ! is_email( $email ) || mb_strlen( $msg ) > 5000 ) {
		return new WP_REST_Response( array( 'ok' => false, 'error' => 'invalid' ), 400 );
	}
	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key = 'edita_contact_' . md5( $ip );
	$n   = (int) get_transient( $key );
	if ( $n >= 5 ) {
		return new WP_REST_Response( array( 'ok' => false, 'error' => 'rate' ), 429 );
	}
	set_transient( $key, $n + 1, HOUR_IN_SECONDS );
	$subject = 'פנייה חדשה מהאתר: ' . $name . ( $type ? ' (' . $type . ')' : '' );
	$body    = "שם: {$name}\nמייל: {$email}\n" . ( $type ? "סוג פרויקט: {$type}\n" : '' ) . "\n" . ( $msg ? $msg : '(בלי הודעה)' ) . "\n\n" . 'נשלח מהטופס ב־' . home_url( '/' );
	$headers = array( 'Content-Type: text/plain; charset=UTF-8', 'Reply-To: ' . $name . ' <' . $email . '>' );
	$sent    = wp_mail( EDITA_SITE_MAILTO, $subject, $body, $headers );
	$log     = get_option( 'edita_contact_log', array() );
	array_unshift( $log, array( 'time' => current_time( 'mysql' ), 'name' => $name, 'email' => $email, 'type' => $type, 'msg' => $msg, 'mailed' => (bool) $sent ) );
	update_option( 'edita_contact_log', array_slice( $log, 0, 200 ), false );
	return new WP_REST_Response( array( 'ok' => (bool) $sent ), $sent ? 200 : 500 );
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
	$html = str_replace( '<script src="js/app.js"></script>', '<script>' . str_replace( '</script', '<\/script', $app ) . '</script>', $html );
	if ( $preview ) {
		$html = str_replace( '<head>', "<head>\n<meta name=\"robots\" content=\"noindex\">", $html );
	}
	status_header( 200 );
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit;
}, 0 );
