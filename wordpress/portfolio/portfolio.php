<?php
defined( 'ABSPATH' ) || exit;

const EDITA_PROJECT = 'edita_project';
const EDITA_CASE_META = '_edita_case';

add_action( 'init', function () {
	register_post_type( EDITA_PROJECT, array(
		'labels' => array(
			'name' => 'פרויקטים', 'singular_name' => 'פרויקט', 'menu_name' => 'פרויקטים',
			'all_items' => 'כל הפרויקטים', 'add_new' => 'הוספת פרויקט', 'add_new_item' => 'הוספת פרויקט',
			'edit_item' => 'עריכת פרויקט', 'new_item' => 'פרויקט חדש', 'search_items' => 'חיפוש פרויקטים',
			'not_found' => 'לא נמצאו פרויקטים', 'not_found_in_trash' => 'אין פרויקטים בפח',
			'attributes' => 'סדר בתיק העבודות', 'item_published' => 'הפרויקט פורסם.', 'item_updated' => 'הפרויקט עודכן.',
		),
		'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'show_in_admin_bar' => true,
		'rewrite' => false, 'query_var' => false, 'capability_type' => 'page', 'map_meta_cap' => true,
		'menu_icon' => 'dashicons-portfolio', 'menu_position' => 21, 'supports' => array( 'title', 'page-attributes' ),
	) );
} );

function edita_portfolio_ready() {
	return '1' === get_option( 'edita_portfolio_seed_v1' );
}

/** Only the first completed import switches public pages over to WordPress. */
function edita_portfolio_import() {
	if ( edita_portfolio_ready() ) { return true; }
	require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
	if ( ! WP_Upgrader::create_lock( 'edita_portfolio_import', 120 ) ) { return false; }
	try {
		if ( edita_portfolio_ready() ) { return true; }
		$seed = json_decode( file_get_contents( __DIR__ . '/seed.json' ), true );
		if ( empty( $seed ) ) { return false; }
		foreach ( $seed as $index => $case ) {
			$existing = get_page_by_path( $case['slug'], OBJECT, EDITA_PROJECT );
			if ( $existing && get_post_meta( $existing->ID, EDITA_CASE_META, true ) ) { continue; }
			$args = array(
				'post_type' => EDITA_PROJECT, 'post_status' => 'publish', 'post_name' => $case['slug'],
				'post_title' => $case['name'], 'menu_order' => ( $index + 1 ) * 10,
				'meta_input' => array( EDITA_CASE_META => $case ),
			);
			if ( $existing ) { $args['ID'] = $existing->ID; }
			$id = wp_insert_post( wp_slash( $args ), true );
			if ( is_wp_error( $id ) || ! get_post_meta( $id, EDITA_CASE_META, true ) ) { return false; }
		}
		update_option( 'edita_portfolio_seed_v1', '1', true );
		return edita_portfolio_ready();
	} finally {
		WP_Upgrader::release_lock( 'edita_portfolio_import' );
	}
}
add_action( 'admin_init', function () {
	if ( current_user_can( 'manage_options' ) && ! edita_portfolio_ready() ) { edita_portfolio_import(); }
} );

function edita_project_site_assets() { return plugin_dir_url( EDITA_SITE_MAIN_FILE ) . 'site/'; }
function edita_project_href( $slug ) { return home_url( '/projects/' . $slug . '/' ); }

function edita_project_image_url( $image ) {
	if ( is_numeric( $image ) ) { return wp_get_attachment_image_url( (int) $image, 'full' ) ?: ''; }
	if ( is_string( $image ) && preg_match( '~^assets/[a-zA-Z0-9_.-]+$~D', $image ) ) {
		return edita_project_site_assets() . $image;
	}
	return '';
}
function edita_project_model( $post, $index ) {
	$c = (array) get_post_meta( $post->ID, EDITA_CASE_META, true );
	$c = array_merge( array( 'client'=>'', 'kind'=>'', 'live'=>'', 'tags'=>array(), 'cats'=>array(), 'facts'=>array(),
		'hook'=>'', 'body1'=>'', 'challenge'=>'', 'solution'=>'', 'body2'=>'', 'scope'=>array(), 'result'=>'', 'lh'=>60 ), $c );
	$c['name'] = $post->post_title;
	$c['slug'] = $post->post_name;
	$c['no'] = str_pad( (string) ( $index + 1 ), 2, '0', STR_PAD_LEFT );
	foreach ( array( 'img','logo','shot','full','demo' ) as $key ) {
		$c[ $key ] = edita_project_image_url( $c[ $key ] ?? '' );
	}
	$c['img'] = $c['img'] ?: ( $c['shot'] ?: ( $c['full'] ?: ( $c['logo'] ?: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=' ) ) );
	$c['logo'] = $c['logo'] ?: $c['img'];
	return $c;
}
function edita_public_projects() {
	$posts = get_posts( array( 'post_type'=>EDITA_PROJECT, 'post_status'=>'publish', 'has_password'=>false,
		'numberposts'=>-1, 'orderby'=>array( 'menu_order'=>'ASC', 'ID'=>'ASC' ), 'suppress_filters'=>true ) );
	$cases = array();
	foreach ( $posts as $i => $post ) { $cases[] = edita_project_model( $post, $i ); }
	return $cases;
}

require_once __DIR__ . '/admin.php';
require_once __DIR__ . '/public.php';
