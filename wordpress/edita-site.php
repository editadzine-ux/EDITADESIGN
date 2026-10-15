<?php
/**
 * Plugin Name: Edita Site
 * Description: מציג את האתר החדש של Edita בעמוד הבית. התוכן נמשך מהריפו editadzine-ux/editadesign ב־GitHub. השבתת התוסף מחזירה את עמוד הבית הקודם.
 * Version: 1.1.0
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
