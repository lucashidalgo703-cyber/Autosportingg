from PIL import Image

def process_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        
        # Diagnostics
        count_already_trans = 0
        count_white_to_trans = 0
        count_red = 0
        count_text_fix = 0
        
        for item in datas:
            r, g, b, a = item
            
            # 0. RESPECT EXISTING TRANSPARENCY
            # If the pixel is already transparent, keep it transparent!
            # The previous bug was treating (0,0,0,0) as "Dark Text" -> White
            if a < 50:
                 new_data.append((255, 255, 255, 0))
                 count_already_trans += 1
                 continue

            # 1. Detect White Background (if any opacity remains)
            if r > 215 and g > 215 and b > 215:
                new_data.append((255, 255, 255, 0)) # Turn Transparent
                count_white_to_trans += 1
                
            # 2. Detect Red Swoosh -> Keep Red
            # Red is dominant. 
            # Tuning thresholds for robustness
            elif r > 100 and r > (g + 30) and r > (b + 30):
                new_data.append((r, g, b, 255))
                count_red += 1
                
            # 3. Detect Blue/Dark Text -> Pure White
            else:
                new_data.append((255, 255, 255, 255)) # Pure White Text
                count_text_fix += 1

        img.putdata(new_data)
        img.save(output_path, "PNG")
        
        print(f"DONE. Stats: AlreadyTrans={count_already_trans}, WhiteBgRemoved={count_white_to_trans}, Red={count_red}, TextFixed={count_text_fix}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Use the failed image source
    input_file = "C:/Users/USER/.gemini/antigravity/brain/29f07675-4bd2-4fd5-b270-449975b7c398/uploaded_media_1770220509087.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-v4.png"
    process_logo(input_file, output_file)
