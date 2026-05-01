import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  useWindowDimensions,
  Modal,
  Animated,
  I18nManager,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400.png?text=لا+توجد+صورة';

export const ImageViewerModal = ({ 
  visible, 
  onClose, 
  images, 
  activeIndex, 
  onNext, 
  onPrev 
}) => {
  if (!images || images.length === 0) return null;
  const currentImage = images[activeIndex] || images[0];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.viewerContainer}>
        <TouchableOpacity 
          style={styles.viewerCloseBtn} 
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.viewerImageWrapper}>
          <Image
            source={{ uri: currentImage }}
            style={styles.viewerImage}
            contentFit="contain"
          />
        </View>
        
        {images.length > 1 && (
          <View style={styles.viewerControls}>
            <TouchableOpacity style={styles.viewerArrow} onPress={onPrev}>
              <Ionicons name="chevron-back" size={36} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={styles.viewerIndexText}>
              {activeIndex + 1} / {images.length}
            </Text>
            
            <TouchableOpacity style={styles.viewerArrow} onPress={onNext}>
              <Ionicons name="chevron-forward" size={36} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

export const ImageGallery = ({ 
  images, 
  height = 400, 
  borderRadius = 0, 
  showDownload = true,
  showCounter = true,
  showArrows = true,
  showThumbnails = true,
  autoplay = false,
  autoplayInterval = 4000,
  contentFit = "contain",
  containerStyle 
}) => {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 768;
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isRTL = I18nManager.isRTL;
  const autoplayTimer = useRef(null);

  const galleryImages = useMemo(() => {
    if (!images || images.length === 0) return [PLACEHOLDER_IMAGE];
    return [...new Set(images.filter(Boolean))];
  }, [images]);

  const onLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
    containerStyle?.onLayout?.(event);
  };

  const itemHeight = typeof height === 'number' ? height : '100%';

  useEffect(() => {
    if (autoplay && galleryImages.length > 1 && !viewerVisible) {
      autoplayTimer.current = setInterval(() => {
        const nextIndex = (activeIndex + 1) % galleryImages.length;
        handleSelectImage(nextIndex);
      }, autoplayInterval);
    }
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    };
  }, [autoplay, activeIndex, galleryImages.length, autoplayInterval, viewerVisible, isDesktop]);

  const animateFade = () => {
    fadeAnim.setValue(0.4);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNextImage = () => {
    const nextIndex = (activeIndex + 1) % galleryImages.length;
    handleSelectImage(nextIndex);
  };

  const handlePrevImage = () => {
    const nextIndex = (activeIndex - 1 + galleryImages.length) % galleryImages.length;
    handleSelectImage(nextIndex);
  };

  const handleSelectImage = (index) => {
    if (index === activeIndex) return;
    
    if (isDesktop) {
      animateFade();
    } else {
      scrollRef.current?.scrollTo({ 
        x: index * (containerWidth || windowWidth), 
        animated: true 
      });
    }
    setActiveIndex(index);
  };

  // Simple scroll-based carousel logic

  const handleDownload = async () => {
    const currentImage = galleryImages[activeIndex];
    if (!currentImage) return;

    setIsDownloading(true);
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(currentImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = `image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } else {
        const filename = `image-${Date.now()}.jpg`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const downloadResumable = FileSystem.createDownloadResumable(currentImage, fileUri, {});
        const result = await downloadResumable.downloadAsync();
        if (result && await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        }
      }
    } catch (error) {
      console.error("Download failed:", error);
      if (Platform.OS === 'web') window.open(currentImage, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };



  return (
    <View 
      style={[styles.container, { borderRadius, height }, containerStyle]}
      onLayout={onLayout}
    >
      {isDesktop ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => setViewerVisible(true)}
              style={{ flex: 1 }}
            >
              <Animated.View style={{ flex: 1, opacity: fadeAnim, width: '100%', height: '100%' }}>
                <Image
                  source={{ uri: galleryImages[activeIndex] || PLACEHOLDER_IMAGE }}
                  style={styles.imgFill}
                  contentFit={contentFit}
                  transition={200}
                />
              </Animated.View>
            </TouchableOpacity>
            
            {(showArrows && galleryImages.length > 1) && (
              <>
                <TouchableOpacity 
                  style={[styles.carouselArrow, { left: 16 }]} 
                  onPress={handlePrevImage}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.carouselArrow, { right: 16 }]} 
                  onPress={handleNextImage}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </>
            )}

            {showCounter && galleryImages.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {activeIndex + 1} / {galleryImages.length}
                </Text>
              </View>
            )}
          </View>
          
          {(showThumbnails && galleryImages.length > 1) ? (
            <View style={styles.thumbnailStrip}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.desktopThumbnailsContainer}
              >
                {galleryImages.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectImage(idx)}
                    style={[
                      styles.desktopThumbnailWrapper,
                      activeIndex === idx && styles.desktopThumbnailActive
                    ]}
                  >
                    <Image
                      source={{ uri: img || PLACEHOLDER_IMAGE }}
                      style={styles.imgFill}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const w = containerWidth || width;
              if (w > 0) {
                const newIndex = Math.round(x / w);
                if (newIndex !== activeIndex && newIndex >= 0 && newIndex < galleryImages.length) {
                  setActiveIndex(newIndex);
                }
              }
            }}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const w = containerWidth || width;
              if (w > 0) {
                const newIndex = Math.round(x / w);
                if (newIndex !== activeIndex && newIndex >= 0 && newIndex < galleryImages.length) {
                  setActiveIndex(newIndex);
                }
              }
            }}
            scrollEventThrottle={16}
            style={{ flex: 1, flexDirection: 'row' }}
            contentContainerStyle={{ height: itemHeight, flexDirection: 'row' }}
          >
            {galleryImages.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.9}
                onPress={() => {
                  setActiveIndex(idx);
                  setViewerVisible(true);
                }}
                style={{ width: containerWidth || width, height: itemHeight, overflow: 'hidden' }}
              >
                <Image
                  source={{ uri: img || PLACEHOLDER_IMAGE }}
                  style={styles.imgFill}
                  contentFit={contentFit}
                  transition={200}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {showCounter && galleryImages.length > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {galleryImages.length}
              </Text>
            </View>
          )}

          {galleryImages.length > 1 && (
            <View style={styles.paginationDots}>
              {galleryImages.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSelectImage(i)}
                  style={[
                    styles.dot,
                    i === activeIndex && { backgroundColor: theme.colors.primary, width: 20 }
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Download Button */}
      {showDownload && (
        <TouchableOpacity
          style={[styles.downloadBtn, isRTL ? { right: 12 } : { left: 12 }, { backgroundColor: theme.colors.surface + 'CC', zIndex: 10 }]}
          onPress={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Ionicons name="download-outline" size={20} color={theme.colors.text} />
          )}
        </TouchableOpacity>
      )}

      {/* Full Screen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        images={galleryImages}
        activeIndex={activeIndex}
        onNext={handleNextImage}
        onPrev={handlePrevImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F6FA'
  },
  imgFill: {
    width: '100%',
    height: '100%'
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  downloadBtn: {
    position: 'absolute',
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  thumbnailStrip: {
    height: 100,
    backgroundColor: '#F5F6FA'
  },
  desktopThumbnailsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    justifyContent: 'center',
    flexGrow: 1,
  },
  desktopThumbnailWrapper: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  desktopThumbnailActive: {
    borderColor: '#000',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  viewerImageWrapper: {
    width: '100%',
    height: '70%',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 40,
  },
  viewerArrow: {
    padding: 10,
  },
  viewerIndexText: {
    color: '#FFF',
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
  },
  counterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  counterText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Tajawal_700Bold',
  },
  mobileArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
});

export default ImageGallery;
