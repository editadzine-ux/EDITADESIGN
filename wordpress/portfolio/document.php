<?php defined( 'ABSPATH' ) || exit; ?>
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="edita-home" content="<?php echo esc_url( home_url( '/' ) ); ?>">
<title><?php echo esc_html( $title ); ?></title>
<meta name="description" content="<?php echo esc_attr( $description ); ?>">
<link rel="canonical" href="<?php echo esc_url( $canonical ); ?>">
<meta property="og:type" content="article">
<meta property="og:title" content="<?php echo esc_attr( $title ); ?>">
<meta property="og:description" content="<?php echo esc_attr( $description ); ?>">
<meta property="og:url" content="<?php echo esc_url( $canonical ); ?>">
<meta property="og:image" content="<?php echo esc_url( $cs['img'] ); ?>">
<meta property="og:image:alt" content="<?php echo esc_attr( $cs['name'] ); ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@300;400;500;600;700&amp;family=Karantina:wght@400;700&amp;family=Syne:wght@500;600;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?php echo esc_url( $url . 'css/site.css?v=' . filemtime( $dir . 'css/site.css' ) ); ?>">
<noscript><style>.cs .rv{opacity:1;transform:none}</style></noscript>
<?php echo edita_project_payload( $projects ); ?>
</head>
<body>
<div id="app"><div class="ed hf" dir="rtl"><?php include __DIR__ . '/case-view.php'; ?></div></div>
<?php foreach ( array( 'react.production.min.js','react-dom.production.min.js','dc-lite.js','app.js' ) as $script ) : ?>
<script src="<?php echo esc_url( $url . 'js/' . $script . ( 'app.js' === $script ? '?v=' . filemtime( $dir . 'js/app.js' ) : '' ) ); ?>"></script>
<?php endforeach; ?>
</body>
</html>
