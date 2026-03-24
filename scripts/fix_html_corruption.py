"""
Fix corrupted index.html file - remove malformed script tag from JavaScript block
"""
import os

html_file = 'd:\\Python\\change5\\TeamVitality\\AU\\index.html'

print("Reading HTML file...")
with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file size: {len(content)} bytes")

# Check if the corruption exists
if '<script src="gps-location.js"></script>' in content and 'catch (error) {' in content:
    print("✓ Found the corrupted section")
    
    # Find the problematic section and fix it
    old_ending = '''          console.log('✅ Flood prediction updated:', result);
        } catch (error) {
          <script src="gps-location.js"></script>
        }
  </body>

</html>'''

    new_ending = '''          console.log('✅ Flood prediction updated:', result);
        } catch (error) {
          console.error('❌ Flood prediction error:', error);
          riskValue.textContent = 'ERROR: FAILED TO FETCH';
          riskMeter.className = 'risk-meter low';
        }
      }

      // Auto-run when prediction tab is opened
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#prediction') {
          setTimeout(runFloodPrediction, 500);
        }
      });
    </script>

    <!-- Additional Scripts -->
    <script src="gps-location.js"></script>
    <script src="chatbot.js"></script>
    <script src="dashboard.js"></script>
  </body>

</html>'''

    # Replace the ending
    if old_ending in content:
        content = content.replace(old_ending, new_ending)
        print("✓ Fixed the corrupted ending")
    else:
        print("⚠ Exact match not found, trying alternative fix...")
        # Try to fix by finding the position
        error_pos = content.find('} catch (error) {\r\n          <script src="gps-location.js"></script>')
        if error_pos != -1:
            # Remove everything from that point and add correct ending
            content = content[:error_pos] + new_ending
            print("✓ Fixed using position-based replacement")
        else:
            print("❌ Could not find the corrupted section")
            exit(1)

    # Write back
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ File fixed! New size: {len(content)} bytes")
    print(f"✅ Saved to: {html_file}")
else:
    print("⚠ The file doesn't appear to have the expected corruption")
    print("File might already be fixed or has a different issue")

print("\n=== FИX COMPLETE ===")
