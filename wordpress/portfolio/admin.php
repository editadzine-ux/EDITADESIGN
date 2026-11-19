<?php
defined( 'ABSPATH' ) || exit;

function edita_project_categories() {
	return array( 'web'=>'אתרים', 'ux'=>'UX/UI', 'identity'=>'זהות ויזואלית', 'campaign'=>'קמפיין' );
}
function edita_project_images() {
	return array( 'img'=>'תמונת שער לתיק העבודות', 'logo'=>'לוגו לשורת הלקוחות', 'full'=>'צילום מסך מלא לגלילה', 'demo'=>'תמונת הדמיה', 'shot'=>'צילום מתוך הפרויקט' );
}
function edita_project_field( $key, $label, $value, $type = 'text' ) {
	$id = 'edita-project-' . $key;
	echo '<p><label for="' . esc_attr( $id ) . '"><strong>' . esc_html( $label ) . '</strong></label><br>';
	if ( 'textarea' === $type ) {
		echo '<textarea class="widefat" rows="3" id="' . esc_attr( $id ) . '" name="edita_case[' . esc_attr( $key ) . ']">' . esc_textarea( $value ) . '</textarea>';
	} else {
		echo '<input class="widefat" type="' . esc_attr( $type ) . '" id="' . esc_attr( $id ) . '" name="edita_case[' . esc_attr( $key ) . ']" value="' . esc_attr( $value ) . '"' . ( 'url' === $type ? ' dir="ltr"' : '' ) . '>';
	}
	echo '</p>';
}
add_action( 'add_meta_boxes_' . EDITA_PROJECT, function () {
	add_meta_box( 'edita-details', 'פרטי הפרויקט', 'edita_project_details_box', EDITA_PROJECT, 'normal', 'high' );
	add_meta_box( 'edita-story', 'סיפור הפרויקט', 'edita_project_story_box', EDITA_PROJECT, 'normal' );
	add_meta_box( 'edita-images', 'תמונות הפרויקט', 'edita_project_images_box', EDITA_PROJECT, 'normal' );
} );
function edita_project_details_box( $post ) {
	$c = (array) get_post_meta( $post->ID, EDITA_CASE_META, true );
	wp_nonce_field( 'edita_save_case', 'edita_case_nonce' );
	if ( 'publish' === $post->post_status && ! $post->post_password ) {
		echo '<p><a href="' . esc_url( edita_project_href( $post->post_name ) ) . '" target="_blank" rel="noopener">פתיחת הפרויקט באתר ↗</a></p>';
	}
	edita_project_field( 'client', 'שם הלקוח או הארגון', $c['client'] ?? '' );
	edita_project_field( 'kind', 'תיאור קצר שמוצג בתיק העבודות', $c['kind'] ?? '' );
	$facts = array_column( $c['facts'] ?? array(), 'v', 'k' );
	foreach ( array( 'type'=>'סוג הפרויקט', 'year'=>'שנה', 'industry'=>'תחום' ) as $key => $label ) {
		edita_project_field( $key, $label, $facts[ $label ] ?? '' );
	}
	edita_project_field( 'live', 'קישור לאתר הלקוח', $c['live'] ?? '', 'url' );
	edita_project_field( 'tags', 'תגיות, מופרדות בפסיקים', implode( ', ', $c['tags'] ?? array() ) );
	echo '<fieldset><legend><strong>קטגוריות לסינון בתיק העבודות</strong></legend>';
	foreach ( edita_project_categories() as $key => $label ) {
		echo '<label style="display:inline-block;margin-inline-end:1em"><input type="checkbox" name="edita_case[cats][]" value="' . esc_attr( $key ) . '" ' . checked( in_array( $key, $c['cats'] ?? array(), true ), true, false ) . '> ' . esc_html( $label ) . '</label>';
	}
	echo '</fieldset>';
}
function edita_project_story_box( $post ) {
	$c = (array) get_post_meta( $post->ID, EDITA_CASE_META, true );
	foreach ( array( 'hook'=>'כותרת האתגר', 'body1'=>'האתגר והרקע', 'solution'=>'כותרת הפתרון', 'body2'=>'תיאור הפתרון', 'result'=>'תוצאת הפרויקט' ) as $key => $label ) {
		edita_project_field( $key, $label, $c[ $key ] ?? '', 'textarea' );
	}
	edita_project_field( 'scope', 'מה כלל הפרויקט? פריט אחד בכל שורה', implode( "\n", $c['scope'] ?? array() ), 'textarea' );
}
function edita_project_images_box( $post ) {
	$c = (array) get_post_meta( $post->ID, EDITA_CASE_META, true );
	foreach ( edita_project_images() as $key => $label ) {
		$value = $c[ $key ] ?? '';
		$url = edita_project_image_url( $value );
		echo '<fieldset data-edita-image style="margin-block:1em"><legend><strong>' . esc_html( $label ) . '</strong></legend><p><img alt="" style="max-width:180px;max-height:90px" ' . ( $url ? 'src="' . esc_url( $url ) . '"' : 'hidden' ) . '></p>';
		echo '<input type="hidden" name="edita_case[' . esc_attr( $key ) . ']" value="' . esc_attr( $value ) . '"><button type="button" class="button" data-select>בחירת תמונה</button> <button type="button" class="button-link" data-clear' . ( $url ? '' : ' hidden' ) . '>הסרה</button></fieldset>';
	}
}
add_action( 'admin_enqueue_scripts', function () {
	$screen = get_current_screen();
	if ( $screen && 'post' === $screen->base && EDITA_PROJECT === $screen->post_type ) {
		wp_enqueue_media();
		wp_enqueue_script( 'edita-project-media', edita_project_site_assets() . 'wordpress/portfolio/admin.js', array( 'media-editor' ), filemtime( __DIR__ . '/admin.js' ), true );
	}
} );
add_action( 'save_post_' . EDITA_PROJECT, function ( $id ) {
	if ( ! isset( $_POST['edita_case_nonce'], $_POST['edita_case'] ) || ! is_array( $_POST['edita_case'] )
		|| ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['edita_case_nonce'] ) ), 'edita_save_case' )
		|| ! current_user_can( 'edit_post', $id ) || wp_is_post_autosave( $id ) || wp_is_post_revision( $id ) ) { return; }
	$form = wp_unslash( $_POST['edita_case'] );
	$c = (array) get_post_meta( $id, EDITA_CASE_META, true );
	unset( $c[0] );
	foreach ( array( 'client','kind','hook','body1','solution','body2','result' ) as $key ) {
		$c[ $key ] = sanitize_textarea_field( $form[ $key ] ?? '' );
	}
	$c['challenge'] = $c['body1'];
	$c['live'] = esc_url_raw( $form['live'] ?? '', array( 'http','https' ) );
	$c['tags'] = array_values( array_filter( array_map( 'sanitize_text_field', explode( ',', $form['tags'] ?? '' ) ), 'strlen' ) );
	$c['scope'] = array_values( array_filter( array_map( 'sanitize_text_field', preg_split( '/\R/u', $form['scope'] ?? '' ) ), 'strlen' ) );
	$c['cats'] = array_values( array_intersect( (array) ( $form['cats'] ?? array() ), array_keys( edita_project_categories() ) ) );
	$c['facts'] = array();
	foreach ( array( 'type'=>'סוג הפרויקט', 'year'=>'שנה', 'industry'=>'תחום' ) as $key => $label ) {
		$value = sanitize_text_field( $form[ $key ] ?? '' );
		if ( '' !== $value ) { $c['facts'][] = array( 'k'=>$label, 'v'=>$value ); }
	}
	foreach ( array_keys( edita_project_images() ) as $key ) {
		$value = $form[ $key ] ?? '';
		if ( '' === $value ) { $c[ $key ] = ''; }
		elseif ( ctype_digit( (string) $value ) && wp_attachment_is_image( (int) $value ) ) { $c[ $key ] = (int) $value; }
	}
	update_post_meta( $id, EDITA_CASE_META, wp_slash( $c ) );
} );
add_filter( 'manage_' . EDITA_PROJECT . '_posts_columns', function ( $columns ) {
	$columns['edita_order'] = 'סדר בתיק העבודות'; $columns['edita_link'] = 'קישור ישיר';
	return $columns;
} );
add_action( 'manage_' . EDITA_PROJECT . '_posts_custom_column', function ( $column, $id ) {
	$post = get_post( $id );
	if ( 'edita_order' === $column ) { echo (int) $post->menu_order; }
	if ( 'edita_link' === $column && 'publish' === $post->post_status && ! $post->post_password ) {
		echo '<a href="' . esc_url( edita_project_href( $post->post_name ) ) . '" target="_blank" rel="noopener">פתיחה באתר ↗</a>';
	}
}, 10, 2 );
add_action( 'pre_get_posts', function ( $query ) {
	if ( is_admin() && $query->is_main_query() && EDITA_PROJECT === $query->get( 'post_type' ) && ! $query->get( 'orderby' ) ) {
		$query->set( 'orderby', array( 'menu_order'=>'ASC', 'ID'=>'ASC' ) );
	}
} );
add_filter( 'wp_insert_post_data', function ( $data ) {
	if ( EDITA_PROJECT === $data['post_type'] && 'auto-draft' === $data['post_status'] && empty( $data['menu_order'] ) ) {
		$last = get_posts( array( 'post_type'=>EDITA_PROJECT, 'post_status'=>array( 'publish','pending','draft','future','private' ), 'numberposts'=>1, 'orderby'=>'menu_order', 'order'=>'DESC' ) );
		$data['menu_order'] = $last ? (int) $last[0]->menu_order + 10 : 10;
	}
	return $data;
} );
